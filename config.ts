import type { ConfigProps } from "@/types/config";

const config = {
  appName: "Magic Create",
  appDescription:
    "A 2026 AI-SaaS boilerplate: Next.js 15, React 19, Clerk, Drizzle + Postgres + pgvector, Vercel AI SDK, Stripe, Resend.",
  domainName: "magic-create.com",
  stripe: {
    plans: [
      {
        tier: "starter",
        priceId: {
          dev: "price_dev_starter_REPLACE_ME",
          prod: "price_prod_starter_REPLACE_ME",
        },
        name: "Starter",
        description: "Perfect to try things out",
        price: 29,
        priceAnchor: 49,
        features: [
          { name: "5 projects" },
          { name: "AI chat" },
          { name: "Email support" },
        ],
      },
      {
        tier: "pro",
        priceId: {
          dev: "price_dev_pro_REPLACE_ME",
          prod: "price_prod_pro_REPLACE_ME",
        },
        isFeatured: true,
        name: "Pro",
        description: "For power users",
        price: 99,
        priceAnchor: 149,
        features: [
          { name: "Unlimited projects" },
          { name: "AI chat with tool use" },
          { name: "Priority support" },
          { name: "RAG over your documents" },
        ],
      },
    ],
  },
  email: {
    from: "Magic Create <hello@magic-create.com>",
    supportEmail: "support@magic-create.com",
  },
  auth: {
    signInUrl: "/sign-in",
    signUpUrl: "/sign-up",
    afterSignInUrl: "/dashboard",
    afterSignUpUrl: "/dashboard",
  },
} satisfies ConfigProps;

export default config;
export type Plan = (typeof config.stripe.plans)[number];
export type PlanTier = Plan["tier"];
