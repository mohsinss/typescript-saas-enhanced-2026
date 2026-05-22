/**
 * Thin GitHub REST client used by scaffolding scripts.
 *
 * Tokens:
 *   - Classic PAT: needs `repo` scope (and `admin:org` for org repos)
 *   - Fine-grained PAT: needs "Administration: read and write" on target user/org
 * Create at: https://github.com/settings/tokens
 */

const GH_API = "https://api.github.com";
const GH_API_VERSION = "2022-11-28";

export interface CreateGitHubRepoInput {
  readonly token: string;
  /** Full git URL: https://github.com/owner/repo(.git)? or git@github.com:owner/repo(.git)? */
  readonly gitUrl: string;
  /** Defaults to true. */
  readonly isPrivate?: boolean;
  readonly description?: string;
}

export interface GitHubRepoResult {
  readonly owner: string;
  readonly repo: string;
  readonly fullName: string;
  readonly htmlUrl: string;
  readonly alreadyExisted: boolean;
}

interface GitHubRepoResponse {
  full_name: string;
  html_url: string;
  private: boolean;
  owner: { login: string };
  name: string;
}

export class GitHubApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`GitHub API ${status}: ${body.slice(0, 400)}`);
    this.name = "GitHubApiError";
  }
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const httpsMatch = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  const sshMatch = url.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);
  const m = httpsMatch ?? sshMatch;
  if (!m) throw new Error(`Not a GitHub URL: ${url}`);
  return { owner: m[1]!, repo: m[2]! };
}

export async function createGitHubRepo(
  input: CreateGitHubRepoInput,
): Promise<GitHubRepoResult> {
  const { owner, repo } = parseGitHubUrl(input.gitUrl);
  const me = await ghFetch<{ login: string }>(input.token, "/user", { method: "GET" });
  const isUserOwned = me.login.toLowerCase() === owner.toLowerCase();
  const endpoint = isUserOwned ? "/user/repos" : `/orgs/${encodeURIComponent(owner)}/repos`;

  const body = {
    name: repo,
    private: input.isPrivate ?? true,
    auto_init: false,
    has_issues: true,
    has_projects: false,
    has_wiki: false,
    ...(input.description && { description: input.description }),
  };

  try {
    const created = await ghFetch<GitHubRepoResponse>(input.token, endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return toResult(created, false);
  } catch (err) {
    if (err instanceof GitHubApiError && err.status === 422 && /already exists/i.test(err.body)) {
      const existing = await ghFetch<GitHubRepoResponse>(
        input.token,
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
        { method: "GET" },
      );
      return toResult(existing, true);
    }
    throw err;
  }
}

export async function deleteGitHubRepo(
  token: string,
  owner: string,
  repo: string,
): Promise<void> {
  await ghFetch<unknown>(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { method: "DELETE" },
  );
}

export async function getGitHubRepo(
  token: string,
  owner: string,
  repo: string,
): Promise<GitHubRepoResult> {
  const data = await ghFetch<GitHubRepoResponse>(
    token,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { method: "GET" },
  );
  return toResult(data, true);
}

function toResult(r: GitHubRepoResponse, alreadyExisted: boolean): GitHubRepoResult {
  return {
    owner: r.owner.login,
    repo: r.name,
    fullName: r.full_name,
    htmlUrl: r.html_url,
    alreadyExisted,
  };
}

async function ghFetch<T>(token: string, path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${GH_API}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": GH_API_VERSION,
      "User-Agent": "magic-create-scaffolder",
    },
  });
  if (!res.ok) throw new GitHubApiError(res.status, await res.text());
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
