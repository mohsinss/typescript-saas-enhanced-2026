import "server-only";
import { eq } from "drizzle-orm";
import { db, subscriptions, users } from "@/db";

export async function getSubscriptionByClerkId(clerkId: string) {
  const rows = await db
    .select({
      subscription: subscriptions,
      user: users,
    })
    .from(subscriptions)
    .innerJoin(users, eq(subscriptions.userId, users.id))
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertSubscription(input: {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string | null;
  status: string;
  hasAccess: boolean;
  currentPeriodEnd: Date | null;
}) {
  const [row] = await db
    .insert(subscriptions)
    .values(input)
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: {
        stripePriceId: input.stripePriceId,
        status: input.status,
        hasAccess: input.hasAccess,
        currentPeriodEnd: input.currentPeriodEnd,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}
