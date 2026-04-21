import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import * as schema from "./schema";

type Db = NeonHttpDatabase<typeof schema>;

let _db: Db | null = null;

function getDb(): Db {
  if (_db) return _db;
  const sql = neon(env.DATABASE_URL);
  _db = drizzle(sql, { schema, logger: env.NODE_ENV === "development" });
  return _db;
}

// Proxy so the first property access lazily initializes the real client.
// This keeps the ergonomic `db.select(...)` API while avoiding neon() at module load
// (important during `next build`'s page-data collection when env may be absent).
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export * from "./schema";
