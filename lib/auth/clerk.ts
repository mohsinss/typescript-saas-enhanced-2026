import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserByClerkId } from "@/lib/db/queries/users";

export async function requireUser() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await getUserByClerkId(userId);
  if (dbUser) {
    return {
      clerkId: userId,
      dbUser,
      email: dbUser.email,
      name: dbUser.name,
      imageUrl: dbUser.imageUrl,
    };
  }

  // Webhook hasn't synced yet — fall back to Clerk's data
  const clerk = await currentUser();
  if (!clerk) redirect("/sign-in");
  return {
    clerkId: clerk.id,
    dbUser: null,
    email: clerk.emailAddresses[0]?.emailAddress ?? "",
    name: clerk.firstName ?? null,
    imageUrl: clerk.imageUrl,
  };
}

export async function getOptionalUser() {
  const { userId } = await auth();
  if (!userId) return null;
  return getUserByClerkId(userId);
}
