import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import config from "@/config";
import { logger } from "@/lib/infrastructure/logger";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
      async profile(profile) {
        logger.info("Google OAuth login", { email: profile.email });
        return {
          id: profile.sub,
          name: profile.given_name ? profile.given_name : profile.name,
          email: profile.email,
          image: profile.picture,
          createdAt: new Date(),
        };
      },
    }),
  ],
  // No adapter - using JWT strategy (stateless auth)
  callbacks: {
    session: async ({ session, token }) => {
      if (session?.user) {
        session.user.id = token.sub!;
      }
      return session;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
  theme: {
    colorScheme: "auto",
    brandColor: config.colors.main,
    logo: `https://${config.domainName}/logoAndName.png`,
  },
  debug: process.env.NODE_ENV === "development",
};

export default NextAuth(authOptions);
