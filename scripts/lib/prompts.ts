/** Interactive prompts used by scaffolding scripts. */
import { text, password, isCancel, cancel } from "@clack/prompts";

const SLUG_RE = /^[a-z][a-z0-9-]*$/;

function exitOnCancel<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel("Cancelled");
    process.exit(0);
  }
  return value as T;
}

export async function askSlug(initial = "my-app"): Promise<string> {
  const v = await text({
    message: "Project slug (kebab-case)",
    initialValue: initial,
    validate: (s) =>
      !s
        ? "required"
        : !SLUG_RE.test(s)
          ? "lowercase letters, digits, and hyphens only"
          : undefined,
  });
  return exitOnCancel(v);
}

export async function askGitUrl(): Promise<string | null> {
  const v = await text({
    message: "GitHub remote URL (blank to skip push)",
    placeholder: "https://github.com/you/repo.git",
    initialValue: "",
  });
  return exitOnCancel(v) || null;
}

export async function askNeonApiKey(): Promise<string | null> {
  const v = await password({
    message: "Neon API key (blank to skip auto-provision)",
    mask: "•",
  });
  return exitOnCancel(v) || null;
}

export async function askGithubToken(): Promise<string | null> {
  const v = await password({
    message: "GitHub token (blank to skip repo creation)",
    mask: "•",
  });
  return exitOnCancel(v) || null;
}
