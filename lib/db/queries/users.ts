import "server-only";
import { eq } from "drizzle-orm";
import { db, users, type NewUser } from "@/db";

export async function getUserByClerkId(clerkId: string) {
  const rows = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertUserFromClerk(input: NewUser) {
  const [row] = await db
    .insert(users)
    .values(input)
    .onConflictDoUpdate({
      target: users.clerkId,
      set: {
        email: input.email,
        name: input.name,
        imageUrl: input.imageUrl,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}

export async function deleteUserByClerkId(clerkId: string) {
  await db.delete(users).where(eq(users.clerkId, clerkId));
}
