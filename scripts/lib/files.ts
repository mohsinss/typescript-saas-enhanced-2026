/** Small file-mutation helpers used by scaffolding scripts. */
import { promises as fs } from "node:fs";
import path from "node:path";

export async function replaceInFile(
  file: string,
  pattern: RegExp,
  replacement: string,
): Promise<void> {
  const buf = await fs.readFile(file, "utf8");
  await fs.writeFile(file, buf.replace(pattern, replacement), "utf8");
}

/**
 * Sets KEY=value in a `.env`-style file. Replaces the first matching line if
 * present, otherwise appends. Value is written verbatim (no quoting); callers
 * must pass URL-safe / shell-safe values, or quote them in advance.
 */
export async function writeEnvVar(
  destination: string,
  filename: string,
  key: string,
  value: string,
): Promise<void> {
  const file = path.join(destination, filename);
  const buf = await fs.readFile(file, "utf8");
  const line = `${key}=${value}`;
  const pat = new RegExp(`^${escapeRegex(key)}=.*$`, "m");
  const next = pat.test(buf) ? buf.replace(pat, line) : `${buf.trimEnd()}\n${line}\n`;
  await fs.writeFile(file, next, "utf8");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
