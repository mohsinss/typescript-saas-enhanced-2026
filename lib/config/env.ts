import { z } from "zod";

/**
 * Environment variable validation schema
 * Validates all required environment variables at startup
 */
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  
  // Database
  MONGODB_URI: z.string().min(1, "MongoDB URI is required"),
  
  // Authentication
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32, "NextAuth secret must be at least 32 characters"),
  
  // Google OAuth (optional)
  GOOGLE_ID: z.string().optional(),
  GOOGLE_SECRET: z.string().optional(),
  
  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  STRIPE_PORTAL_LINK: z.string().url().optional(),
  
  // Email
  EMAIL_SERVER: z.string().optional(),
  MAILGUN_API_KEY: z.string().optional(),
  MAILGUN_DOMAIN: z.string().optional(),
  
  // OpenAI (optional)
  OPENAI_API_KEY: z.string().startsWith("sk-").optional(),
  
  // Application
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

// Type for validated environment variables
export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables and returns typed env object
 * Throws error if validation fails
 */
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors
        .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
        .join("\n");
      
      throw new Error(
        `Environment validation failed:\n${formattedErrors}\n\nPlease check your .env.local file`
      );
    }
    throw error;
  }
}

// Validate environment variables on module load
export const env = validateEnv();

// Helper to check if feature is enabled based on env vars
export const features = {
  stripe: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET),
  googleAuth: Boolean(env.GOOGLE_ID && env.GOOGLE_SECRET),
  emailAuth: Boolean(env.EMAIL_SERVER),
  mailgun: Boolean(env.MAILGUN_API_KEY && env.MAILGUN_DOMAIN),
  openai: Boolean(env.OPENAI_API_KEY),
} as const;
