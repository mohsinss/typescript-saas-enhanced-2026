#!/usr/bin/env tsx
/* eslint-disable no-console */
import { execa } from "execa";
import chalk from "chalk";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createNeonProject, NeonApiError } from "./lib/neon.js";
import { createGitHubRepo, GitHubApiError } from "./lib/github.js";
import { askSlug, askGitUrl, askNeonApiKey, askGithubToken } from "./lib/prompts.js";
import { replaceInFile, writeEnvVar } from "./lib/files.js";
import { parseArgs, CliError } from "./lib/args.js";
import { makeReporter, type Reporter } from "./lib/reporter.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SLUG_RE = /^[a-z][a-z0-9-]*$/;

const RSYNC_EXCLUDES = [
  "--exclude=.git",
  "--exclude=node_modules",
  "--exclude=.next",
  "--exclude=.env",
  "--exclude=.env.local",
  "--exclude=.env.development",
  "--exclude=.env.development.local",
  "--exclude=.env.production",
  "--exclude=.env.production.local",
  "--exclude=.env.test",
  "--exclude=.env.vercel",
  "--exclude=.vercel",
  "--exclude=.turbo",
  "--exclude=coverage",
  "--exclude=playwright-report",
  "--exclude=test-results",
  "--exclude=.email-export",
  "--exclude=.claude",
  "--exclude=.DS_Store",
];

const HELP = `magic-create — scaffold a new project from this boilerplate.
Usage:
  pnpm new-project <slug> [git-url] [flags]
Flags:
  -q, --quiet              Plain-text grep-friendly output (no spinners/banners)
      --log-file <path>    Append a clean transcript to <path>
  -h, --help               Show this help
Env vars (optional, skip interactive prompts when set):
  NEON_API_KEY             Auto-provision a Neon DB
  NEON_REGION_ID           Override Neon region (default: account default)
  GITHUB_TOKEN             Auto-create a private GitHub repo before push`;

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help) {
    console.log(HELP);
    return;
  }
  const reporter = makeReporter({ quiet: parsed.quiet, logFile: parsed.logFile });
  try {
    await run(parsed.positional, reporter);
  } finally {
    await reporter.close();
  }
}

async function run(positional: readonly string[], reporter: Reporter) {
  reporter.intro(chalk.bold("magic-create — new project"));
  const [argSlug, argGitUrl] = positional;

  const slug = argSlug ?? (await askSlug());
  if (!SLUG_RE.test(slug)) {
    throw new CliError(`Invalid slug "${slug}" — must be kebab-case, lowercase, starts with a letter.`);
  }
  const displayName = toDisplayName(slug);
  const destination = path.join(path.dirname(ROOT), slug);

  const gitUrl = argGitUrl ?? (await askGitUrl());
  const neonApiKey = process.env.NEON_API_KEY ?? (await askNeonApiKey());
  const githubToken = gitUrl ? (process.env.GITHUB_TOKEN ?? (await askGithubToken())) : null;

  if (destination === ROOT) throw new CliError("Refusing to scaffold into the boilerplate itself.");
  await assertEmptyDestination(destination);

  const copy = reporter.step(`Copying boilerplate -> ${destination}`);
  await execa("rsync", ["-a", ...RSYNC_EXCLUDES, `${ROOT}/`, destination]);
  copy.stop("Copied.");

  const rename = reporter.step("Renaming references");
  await applyRenames(destination, slug, displayName);
  rename.stop("Renamed.");

  const envCopy = reporter.step("Creating .env.local from .env.example");
  await fs.copyFile(path.join(destination, ".env.example"), path.join(destination, ".env.local"));
  envCopy.stop(".env.local created (fill in secrets later).");

  if (neonApiKey) await provisionNeon(reporter, destination, slug, neonApiKey);
  else reporter.info(chalk.dim("  (Skipped Neon. Set NEON_API_KEY to auto-provision.)"));

  const git = reporter.step("Initializing git");
  await execa("git", ["init", "-b", "main"], { cwd: destination });
  await execa("git", ["add", "."], { cwd: destination });
  await execa("git", ["commit", "-m", "chore: initial commit from magic-create boilerplate"], { cwd: destination });
  git.stop("git initialized.");

  if (gitUrl) {
    if (githubToken && /^(https:\/\/github\.com\/|git@github\.com:)/.test(gitUrl)) {
      await provisionGitHub(reporter, gitUrl, githubToken, displayName);
    }
    await pushToRemote(reporter, destination, gitUrl);
  }

  reporter.outro(chalk.green(`${displayName} is ready`));
  reporter.info(
    chalk.dim(
      `\nNext:\n  cd ${destination}\n  # edit .env.local with remaining secrets (AUTH_SECRET, ANTHROPIC_API_KEY)\n  pnpm install\n  pnpm db:generate && pnpm db:migrate\n  pnpm dev\n`,
    ),
  );
}

function toDisplayName(slug: string): string {
  return slug
    .split(/-|_/)
    .map((w) => (w[0] ?? "").toUpperCase() + w.slice(1))
    .join(" ");
}

async function assertEmptyDestination(destination: string): Promise<void> {
  try {
    const existing = await fs.readdir(destination);
    if (existing.length > 0) {
      throw new CliError(`Destination ${destination} exists and is not empty.`);
    }
  } catch (err) {
    if (err instanceof CliError) throw err;
    // ENOENT means the directory doesn't exist — that's fine.
  }
}

async function applyRenames(destination: string, slug: string, displayName: string) {
  await replaceInFile(path.join(destination, "package.json"), /"name": "[^"]+"/, `"name": "${slug}"`);
  await replaceInFile(path.join(destination, "config.ts"), /appName: "[^"]+"/, `appName: "${displayName}"`);
  await replaceInFile(path.join(destination, "config.ts"), /domainName: "[^"]+"/, `domainName: "${slug}.com"`);
}

async function provisionNeon(reporter: Reporter, destination: string, slug: string, apiKey: string) {
  const step = reporter.step(`Provisioning Neon project "${slug}"`);
  try {
    const neon = await createNeonProject({ apiKey, name: slug, regionId: process.env.NEON_REGION_ID });
    await writeEnvVar(destination, ".env.local", "DATABASE_URL", neon.pooled);
    await writeEnvVar(destination, ".env.local", "DATABASE_URL_UNPOOLED", neon.unpooled);
    step.stop(`Neon project provisioned (id: ${neon.projectId}).`);
  } catch (err) {
    const msg = err instanceof NeonApiError ? err.message : (err as Error).message;
    step.stop("Neon provisioning failed — DB URLs left as placeholders.");
    reporter.error(chalk.dim(`(${msg.slice(0, 300)})`));
  }
}

async function provisionGitHub(reporter: Reporter, gitUrl: string, token: string, displayName: string) {
  const step = reporter.step(`Creating GitHub repo (private, no README) for ${gitUrl}`);
  try {
    const repo = await createGitHubRepo({
      token,
      gitUrl,
      isPrivate: true,
      description: `${displayName} — scaffolded by magic-create.`,
    });
    step.stop(repo.alreadyExisted ? `GitHub repo already existed: ${repo.htmlUrl}` : `GitHub repo created: ${repo.htmlUrl}`);
  } catch (err) {
    const msg = err instanceof GitHubApiError ? err.message : (err as Error).message;
    step.stop("GitHub repo creation failed — will still attempt push.");
    reporter.error(chalk.dim(`(${msg.slice(0, 300)})`));
  }
}

async function pushToRemote(reporter: Reporter, destination: string, gitUrl: string) {
  const step = reporter.step(`Pushing to ${gitUrl}`);
  try {
    await execa("git", ["remote", "add", "origin", gitUrl], { cwd: destination });
    await execa("git", ["push", "-u", "origin", "main"], { cwd: destination });
    step.stop("Pushed.");
  } catch (err) {
    step.stop(`Push failed. Run manually: cd ${destination} && git push -u origin main`);
    reporter.error(chalk.dim(`(${(err as Error).message.slice(0, 300)})`));
  }
}

main().catch((e) => {
  if (e instanceof CliError) {
    console.error(chalk.red(e.message));
    process.exit(1);
  }
  console.error(e);
  process.exit(1);
});
