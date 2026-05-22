/**
 * Thin Neon API client used by scaffolding scripts.
 *
 * Auth: Bearer token from https://console.neon.tech/app/settings/api-keys
 * Docs: https://api-docs.neon.tech/reference/createproject
 */

const NEON_API = "https://console.neon.tech/api/v2";

export interface CreateNeonProjectInput {
  readonly apiKey: string;
  readonly name: string;
  /** e.g. "aws-us-east-1". Omit to use account default. */
  readonly regionId?: string;
  /** e.g. 16. Omit to use Neon default. */
  readonly pgVersion?: number;
}

export interface NeonProjectConnection {
  readonly projectId: string;
  readonly databaseName: string;
  readonly roleName: string;
  /** Pooled URI (PgBouncer). Use as DATABASE_URL at runtime. */
  readonly pooled: string;
  /** Direct URI. Use as DATABASE_URL_UNPOOLED for migrations. */
  readonly unpooled: string;
}

interface NeonCreateProjectResponse {
  project: { id: string };
  connection_uris?: Array<{ connection_uri: string }>;
  roles?: Array<{ name: string }>;
  databases?: Array<{ name: string }>;
}

export class NeonApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Neon API ${status}: ${body.slice(0, 400)}`);
    this.name = "NeonApiError";
  }
}

export async function createNeonProject(
  input: CreateNeonProjectInput,
): Promise<NeonProjectConnection> {
  const data = await neonFetch<NeonCreateProjectResponse>(input.apiKey, "/projects", {
    method: "POST",
    body: JSON.stringify({
      project: {
        name: input.name,
        ...(input.regionId && { region_id: input.regionId }),
        ...(input.pgVersion && { pg_version: input.pgVersion }),
      },
    }),
  });

  const rawUri = data.connection_uris?.[0]?.connection_uri;
  if (!rawUri) {
    throw new Error("Neon API: response missing connection_uris[0].connection_uri");
  }

  const unpooled = ensureSecureParams(rawUri);
  const pooled = toPooled(unpooled);

  return {
    projectId: data.project.id,
    databaseName: data.databases?.[0]?.name ?? "neondb",
    roleName: data.roles?.[0]?.name ?? "neondb_owner",
    pooled,
    unpooled,
  };
}

export interface NeonProjectMeta {
  readonly id: string;
  readonly name: string;
  readonly regionId: string;
}

export async function getNeonProject(
  apiKey: string,
  projectId: string,
): Promise<NeonProjectMeta> {
  const data = await neonFetch<{ project: { id: string; name: string; region_id: string } }>(
    apiKey,
    `/projects/${encodeURIComponent(projectId)}`,
    { method: "GET" },
  );
  return {
    id: data.project.id,
    name: data.project.name,
    regionId: data.project.region_id,
  };
}

export async function deleteNeonProject(
  apiKey: string,
  projectId: string,
): Promise<void> {
  await neonFetch<unknown>(apiKey, `/projects/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
  });
}

async function neonFetch<T>(
  apiKey: string,
  path: string,
  init: RequestInit,
): Promise<T> {
  const res = await fetch(`${NEON_API}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new NeonApiError(res.status, await res.text());
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/**
 * Insert "-pooler" into the endpoint host so PgBouncer is used.
 *   ep-xxx.region.aws.neon.tech -> ep-xxx-pooler.region.aws.neon.tech
 * Idempotent: returns input unchanged if "-pooler" is already present.
 */
function toPooled(uri: string): string {
  if (/@ep-[a-z0-9-]+-pooler\./.test(uri)) return uri;
  return uri.replace(/@(ep-[a-z0-9-]+?)(\.[^/]+)/, "@$1-pooler$2");
}

function ensureSecureParams(uri: string): string {
  const u = new URL(uri);
  if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
  if (!u.searchParams.has("channel_binding")) {
    u.searchParams.set("channel_binding", "require");
  }
  return u.toString();
}
