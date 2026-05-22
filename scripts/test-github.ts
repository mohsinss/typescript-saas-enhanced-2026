#!/usr/bin/env tsx
/**
 * End-to-end test for the GitHub repo provisioning used by new-project.ts.
 *
 * Creates a real throwaway private repo named "magic-create-test-<hex>" under
 * the authenticated user, asserts privacy/no-README, then deletes it.
 * Requires GITHUB_TOKEN with `repo` + `delete_repo` scope (classic PAT) or
 * fine-grained equivalent on the target account.
 *
 * Run: pnpm test:github
 */
/* eslint-disable no-console */
import { strict as assert } from "node:assert";
import { randomBytes } from "node:crypto";
import chalk from "chalk";
import {
  createGitHubRepo,
  deleteGitHubRepo,
  getGitHubRepo,
  parseGitHubUrl,
} from "./lib/github.js";

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error(chalk.red("GITHUB_TOKEN is not set in the environment."));
  process.exit(1);
}

async function whoAmI(): Promise<string> {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "magic-create-scaffolder",
    },
  });
  if (!res.ok) throw new Error(`GET /user failed: HTTP ${res.status}`);
  const data = (await res.json()) as { login: string };
  return data.login;
}

async function repoHasReadme(token: string, owner: string, repo: string): Promise<boolean> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/README.md`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "magic-create-scaffolder",
      },
    },
  );
  if (res.status === 404) return false;
  if (res.ok) return true;
  throw new Error(`Unexpected status checking README: ${res.status}`);
}

async function main() {
  const repoName = `magic-create-test-${randomBytes(4).toString("hex")}`;
  const login = await whoAmI();
  const gitUrl = `https://github.com/${login}/${repoName}.git`;
  console.log(chalk.bold(`\ngithub integration test — owner="${login}" repo="${repoName}"\n`));

  const parsed = parseGitHubUrl(gitUrl);
  assert.equal(parsed.owner, login, "parseGitHubUrl owner mismatch");
  assert.equal(parsed.repo, repoName, "parseGitHubUrl repo mismatch");
  console.log(chalk.green("  ✓"), "parseGitHubUrl extracts owner/repo correctly");

  let created: Awaited<ReturnType<typeof createGitHubRepo>> | null = null;
  try {
    console.log(chalk.cyan("→"), `POST /user/repos { name: "${repoName}", private: true, auto_init: false }`);
    created = await createGitHubRepo({ token: token!, gitUrl, isPrivate: true });
    assert.equal(created.alreadyExisted, false, "should be a fresh repo");
    assert.equal(created.owner.toLowerCase(), login.toLowerCase(), "owner mismatch");
    assert.equal(created.repo, repoName, "repo name mismatch");
    console.log(chalk.green("  ✓"), `repo created: ${created.htmlUrl}`);

    const meta = await getGitHubRepo(token!, login, repoName);
    assert.equal(meta.fullName, `${login}/${repoName}`, "fullName mismatch on GET");
    console.log(chalk.green("  ✓"), "GET /repos verifies fullName");

    const privacy = await fetchPrivacy(token!, login, repoName);
    assert.equal(privacy, true, "repo should be private");
    console.log(chalk.green("  ✓"), "repo is private");

    const hasReadme = await repoHasReadme(token!, login, repoName);
    assert.equal(hasReadme, false, "repo should have no README (auto_init: false)");
    console.log(chalk.green("  ✓"), "repo has no README");

    console.log(chalk.cyan("→"), "POST again (idempotency: should return alreadyExisted=true)");
    const second = await createGitHubRepo({ token: token!, gitUrl, isPrivate: true });
    assert.equal(second.alreadyExisted, true, "second creation should detect existing repo");
    console.log(chalk.green("  ✓"), "duplicate create returns alreadyExisted=true");

    console.log(chalk.bold.green("\nAll assertions passed.\n"));
  } finally {
    if (created) {
      try {
        await deleteGitHubRepo(token!, login, repoName);
        console.log(chalk.dim(`cleanup: deleted ${login}/${repoName}`));
      } catch (err) {
        console.error(
          chalk.red(`cleanup FAILED — delete ${login}/${repoName} manually.`),
          (err as Error).message,
        );
      }
    }
  }
}

async function fetchPrivacy(token: string, owner: string, repo: string): Promise<boolean> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "magic-create-scaffolder",
    },
  });
  if (!res.ok) throw new Error(`GET /repos failed: ${res.status}`);
  const data = (await res.json()) as { private: boolean };
  return data.private;
}

main().catch((e) => {
  console.error(chalk.red("\nTEST FAILED:"), e instanceof Error ? e.message : e);
  process.exit(1);
});
