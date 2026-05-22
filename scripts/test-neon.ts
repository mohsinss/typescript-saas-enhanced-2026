#!/usr/bin/env tsx
/**
 * End-to-end test for the Neon provisioning integration used by new-project.ts.
 *
 * Creates a real throwaway Neon project named "magic-create-test-<hex>",
 * asserts the project name, URL shape, and live connectivity, then deletes
 * the project. Requires NEON_API_KEY in the environment.
 *
 * Run: pnpm test:neon
 */
/* eslint-disable no-console */
import { strict as assert } from "node:assert";
import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import chalk from "chalk";
import { neon } from "@neondatabase/serverless";
import {
  createNeonProject,
  deleteNeonProject,
  getNeonProject,
  type NeonProjectConnection,
} from "./lib/neon.js";
import { writeEnvVar } from "./lib/files.js";

const apiKey = process.env.NEON_API_KEY;
if (!apiKey) {
  console.error(chalk.red("NEON_API_KEY is not set in the environment."));
  process.exit(1);
}

const slug = `magic-create-test-${randomBytes(4).toString("hex")}`;

async function main() {
  console.log(chalk.bold(`\nneon integration test — slug="${slug}"\n`));
  let projectId: string | null = null;
  try {
    await testWriteEnvVar();

    console.log(chalk.cyan("→"), `POST /projects { name: "${slug}" }`);
    const conn = await createNeonProject({ apiKey: apiKey!, name: slug });
    projectId = conn.projectId;
    console.log(chalk.green("  ✓"), `project created: ${projectId}`);

    assertConnectionShape(conn);

    const meta = await getNeonProject(apiKey!, projectId);
    assert.equal(
      meta.name,
      slug,
      `Neon-side project.name should be "${slug}", got "${meta.name}"`,
    );
    console.log(chalk.green("  ✓"), `Neon-side project.name === "${slug}"`);

    await testQuery(conn.pooled, "pooled");
    await testQuery(conn.unpooled, "unpooled");

    console.log(chalk.bold.green("\nAll assertions passed.\n"));
  } finally {
    if (projectId) {
      try {
        await deleteNeonProject(apiKey!, projectId);
        console.log(chalk.dim(`cleanup: deleted project ${projectId}`));
      } catch (err) {
        console.error(
          chalk.red(
            `cleanup FAILED — delete project ${projectId} manually at console.neon.tech`,
          ),
          (err as Error).message,
        );
      }
    }
  }
}

async function testWriteEnvVar() {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "neon-test-"));
  try {
    const file = path.join(tmp, ".env.local");
    await fs.writeFile(file, "DATABASE_URL=postgresql://placeholder\nOTHER=keep\n");
    await writeEnvVar(tmp, ".env.local", "DATABASE_URL", "postgresql://new");
    await writeEnvVar(tmp, ".env.local", "DATABASE_URL_UNPOOLED", "postgresql://new-direct");
    const out = await fs.readFile(file, "utf8");
    assert.match(out, /^DATABASE_URL=postgresql:\/\/new$/m, "replace failed");
    assert.match(out, /^OTHER=keep$/m, "unrelated line should be preserved");
    assert.match(out, /^DATABASE_URL_UNPOOLED=postgresql:\/\/new-direct$/m, "append failed");
    console.log(chalk.green("  ✓"), "writeEnvVar replaces existing keys and appends new ones");
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

function assertConnectionShape(r: NeonProjectConnection) {
  assert.ok(r.projectId.length > 0, "projectId is empty");

  const pooledHost = new URL(r.pooled).host;
  const unpooledHost = new URL(r.unpooled).host;
  assert.match(pooledHost, /-pooler\./, `pooled host missing -pooler: ${pooledHost}`);
  assert.doesNotMatch(
    unpooledHost,
    /-pooler\./,
    `unpooled host must not contain -pooler: ${unpooledHost}`,
  );
  console.log(chalk.green("  ✓"), "pooled host has -pooler, unpooled does not");

  for (const [label, uri] of [["pooled", r.pooled], ["unpooled", r.unpooled]] as const) {
    const u = new URL(uri);
    assert.equal(u.searchParams.get("sslmode"), "require", `${label} missing sslmode=require`);
    assert.equal(
      u.searchParams.get("channel_binding"),
      "require",
      `${label} missing channel_binding=require`,
    );
  }
  console.log(chalk.green("  ✓"), "both URIs have sslmode=require & channel_binding=require");
}

async function testQuery(uri: string, label: string) {
  console.log(chalk.cyan("→"), `SELECT 1 via ${label}`);
  const sql = neon(uri);
  const rows = (await sql`SELECT 1 as one`) as Array<{ one: number }>;
  assert.equal(rows[0]?.one, 1, `${label} query did not return 1`);
  console.log(chalk.green("  ✓"), `${label} connection works`);
}

main().catch((e) => {
  console.error(chalk.red("\nTEST FAILED:"), e instanceof Error ? e.message : e);
  process.exit(1);
});
