#!/usr/bin/env tsx
/* eslint-disable no-console */
import {
  intro,
  outro,
  text,
  confirm,
  password,
  note,
  isCancel,
  cancel,
  spinner,
} from "@clack/prompts";
import { execa } from "execa";
import chalk from "chalk";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

type Answers = {
  projectName: string;
  projectSlug: string;
  destination: string;
  appUrl: string;
  clerkPk: string;
  clerkSk: string;
  clerkWhSec: string;
  databaseUrl: string;
  databaseUrlUnpooled: string;
  anthropicKey: string;
  stripe?: { sk: string; whsec: string };
  resend?: { key: string; from: string };
  upstash?: { url: string; token: string; qstash: string };
  sentryDsn?: string;
  posthogKey?: string;
  createGithub: boolean;
  installNow: boolean;
};

async function ask(): Promise<Answers> {
  intro(chalk.bold("magic-create — new project"));

  const projectName = await textReq("Project name (display)", "Acme");
  const projectSlug = await textReq("Project slug (kebab-case)", toSlug(projectName));
  const destination = await textReq(
    "Destination directory",
    path.join(path.dirname(ROOT), projectSlug),
  );
  const appUrl = await textReq("App URL for dev", "http://localhost:3000");

  note("Clerk — https://dashboard.clerk.com");
  const clerkPk = await textReq("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (pk_...)", "");
  const clerkSk = await secretReq("CLERK_SECRET_KEY (sk_...)");
  const clerkWhSec = await secretReq("CLERK_WEBHOOK_SIGNING_SECRET (whsec_...)");

  note("Neon — https://neon.tech");
  const databaseUrl = await secretReq("DATABASE_URL (pooled)");
  const databaseUrlUnpooled = await secretReq("DATABASE_URL_UNPOOLED (direct)");

  note("Anthropic — https://console.anthropic.com");
  const anthropicKey = await secretReq("ANTHROPIC_API_KEY (sk-ant-...)");

  const withStripe = await boolAsk("Wire Stripe?", false);
  const stripe = withStripe
    ? {
        sk: await secretReq("STRIPE_SECRET_KEY"),
        whsec: await secretReq("STRIPE_WEBHOOK_SECRET"),
      }
    : undefined;

  const withResend = await boolAsk("Wire Resend?", false);
  const resend = withResend
    ? {
        key: await secretReq("RESEND_API_KEY"),
        from: await textReq("EMAIL_FROM", `${projectName} <hello@${projectSlug}.com>`),
      }
    : undefined;

  const withUpstash = await boolAsk("Wire Upstash?", false);
  const upstash = withUpstash
    ? {
        url: await secretReq("UPSTASH_REDIS_REST_URL"),
        token: await secretReq("UPSTASH_REDIS_REST_TOKEN"),
        qstash: await secretReq("QSTASH_TOKEN"),
      }
    : undefined;

  const withSentry = await boolAsk("Wire Sentry?", false);
  const sentryDsn = withSentry ? await textReq("NEXT_PUBLIC_SENTRY_DSN", "") : undefined;

  const withPostHog = await boolAsk("Wire PostHog?", false);
  const posthogKey = withPostHog ? await textReq("NEXT_PUBLIC_POSTHOG_KEY (phc_...)", "") : undefined;

  const createGithub = await boolAsk("Create GitHub repo (via gh CLI)?", false);
  const installNow = await boolAsk("Run pnpm install now?", true);

  return {
    projectName,
    projectSlug,
    destination,
    appUrl,
    clerkPk,
    clerkSk,
    clerkWhSec,
    databaseUrl,
    databaseUrlUnpooled,
    anthropicKey,
    stripe,
    resend,
    upstash,
    sentryDsn,
    posthogKey,
    createGithub,
    installNow,
  };
}

async function run() {
  const a = await ask();
  const s = spinner();

  try {
    await fs.access(a.destination);
    const existing = await fs.readdir(a.destination);
    if (existing.length > 0) {
      cancel(`Destination ${a.destination} exists and is not empty`);
      process.exit(1);
    }
  } catch {
    // directory does not exist — good
  }

  s.start("Copying boilerplate…");
  await execa("rsync", [
    "-a",
    "--exclude=.git",
    "--exclude=node_modules",
    "--exclude=.next",
    "--exclude=.env.local",
    `${ROOT}/`,
    a.destination,
  ]);
  s.stop("Copied.");

  s.start("Renaming references…");
  await replaceInFile(
    path.join(a.destination, "package.json"),
    /"name": "[^"]+"/,
    `"name": "${a.projectSlug}"`,
  );
  await replaceInFile(
    path.join(a.destination, "config.ts"),
    /appName: "[^"]+"/,
    `appName: "${a.projectName}"`,
  );
  await replaceInFile(
    path.join(a.destination, "config.ts"),
    /domainName: "[^"]+"/,
    `domainName: "${a.projectSlug}.com"`,
  );
  s.stop("Renamed.");

  s.start("Writing .env.local…");
  const lines = [
    `NODE_ENV=development`,
    `NEXT_PUBLIC_APP_URL=${a.appUrl}`,
    `DATABASE_URL=${a.databaseUrl}`,
    `DATABASE_URL_UNPOOLED=${a.databaseUrlUnpooled}`,
    `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${a.clerkPk}`,
    `CLERK_SECRET_KEY=${a.clerkSk}`,
    `CLERK_WEBHOOK_SIGNING_SECRET=${a.clerkWhSec}`,
    `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`,
    `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`,
    `ANTHROPIC_API_KEY=${a.anthropicKey}`,
  ];
  if (a.stripe) lines.push(`STRIPE_SECRET_KEY=${a.stripe.sk}`, `STRIPE_WEBHOOK_SECRET=${a.stripe.whsec}`);
  if (a.resend) lines.push(`RESEND_API_KEY=${a.resend.key}`, `EMAIL_FROM=${a.resend.from}`);
  if (a.upstash) {
    lines.push(
      `UPSTASH_REDIS_REST_URL=${a.upstash.url}`,
      `UPSTASH_REDIS_REST_TOKEN=${a.upstash.token}`,
      `QSTASH_TOKEN=${a.upstash.qstash}`,
    );
  }
  if (a.sentryDsn) lines.push(`NEXT_PUBLIC_SENTRY_DSN=${a.sentryDsn}`);
  if (a.posthogKey)
    lines.push(`NEXT_PUBLIC_POSTHOG_KEY=${a.posthogKey}`, `NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com`);
  await fs.writeFile(path.join(a.destination, ".env.local"), lines.join("\n") + "\n", "utf8");
  s.stop(".env.local written.");

  s.start("Initializing git…");
  await execa("git", ["init", "-b", "main"], { cwd: a.destination });
  await execa("git", ["add", "."], { cwd: a.destination });
  await execa(
    "git",
    ["commit", "-m", "chore: initial scaffold from magic-create boilerplate"],
    { cwd: a.destination },
  );
  s.stop("git initialized.");

  if (a.installNow) {
    s.start("pnpm install…");
    await execa("pnpm", ["install"], { cwd: a.destination, stdio: "inherit" });
    s.stop("Installed.");
  }

  if (a.createGithub) {
    s.start("Creating GitHub repo via gh…");
    try {
      await execa("gh", ["repo", "create", a.projectSlug, "--private", "--source", ".", "--push"], {
        cwd: a.destination,
        stdio: "inherit",
      });
      s.stop("GitHub repo created + pushed.");
    } catch {
      s.stop("gh failed — run `gh repo create` manually.");
    }
  }

  outro(chalk.green(`${a.projectName} is ready at ${a.destination}`));
  console.log(
    chalk.dim(
      `\nNext steps:\n  cd ${a.destination}\n  pnpm db:generate && pnpm db:migrate\n  pnpm dev\n`,
    ),
  );
}

async function textReq(label: string, initial = "") {
  const v = await text({
    message: label,
    initialValue: initial,
    validate: (s) => (!s ? "required" : undefined),
  });
  if (isCancel(v)) {
    cancel("Cancelled");
    process.exit(0);
  }
  return v as string;
}

async function secretReq(label: string) {
  const v = await password({
    message: label,
    validate: (s) => (!s ? "required" : undefined),
  });
  if (isCancel(v)) {
    cancel("Cancelled");
    process.exit(0);
  }
  return v as string;
}

async function boolAsk(label: string, initial: boolean) {
  const v = await confirm({ message: label, initialValue: initial });
  if (isCancel(v)) {
    cancel("Cancelled");
    process.exit(0);
  }
  return v as boolean;
}

function toSlug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function replaceInFile(file: string, pat: RegExp, repl: string) {
  const buf = await fs.readFile(file, "utf8");
  await fs.writeFile(file, buf.replace(pat, repl), "utf8");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
