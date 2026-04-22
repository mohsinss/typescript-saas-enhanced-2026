import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db, subscriptions } from "@/db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      hasAccess?: boolean;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        try {
          const [sub] = await db
            .select({ hasAccess: subscriptions.hasAccess })
            .from(subscriptions)
            .where(eq(subscriptions.userId, user.id))
            .limit(1);
          session.user.hasAccess = sub?.hasAccess ?? false;
        } catch {
          session.user.hasAccess = false;
        }
      }
      return session;
    },
  },
});
