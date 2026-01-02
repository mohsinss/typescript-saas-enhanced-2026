import { z } from "zod";

/**
 * Common validation schemas used across the application
 */

// MongoDB ObjectId or UUID validation
// Accepts both MongoDB ObjectIds (24 hex chars) and UUIDs (36 chars with dashes)
export const objectIdSchema = z.string().regex(
  /^([0-9a-fA-F]{24}|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/,
  "Invalid ID format"
);

// Email validation
export const emailSchema = z.string().email("Invalid email address").toLowerCase();

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

// User schemas
export const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: emailSchema,
  image: z.string().url().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  image: z.string().url().optional(),
});

// Lead schemas
export const createLeadSchema = z.object({
  email: emailSchema,
  name: z.string().min(1).max(100).optional(),
  source: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Project schemas
export const createProjectSchema = z.object({
  _id: z.string().optional(),
  projectName: z.string().min(1, "Project name is required").max(200),
  budget: z.number().positive("Budget must be positive").max(1000000000),
  timeline: z.number().int().positive("Timeline must be positive").max(365),
  description: z.string().min(10, "Description must be at least 10 characters").max(5000),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.enum(["draft", "in-review", "approved", "rejected"]).optional(),
  analysis: z.object({
    score: z.number().min(0).max(100),
    risks: z.array(z.string()),
    recommendations: z.array(z.string()),
  }).optional(),
});

// Payment schemas
export const createCheckoutSchema = z.object({
  priceId: z.string().startsWith("price_"),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const stripeWebhookSchema = z.object({
  id: z.string(),
  object: z.string(),
  type: z.string(),
  data: z.object({
    object: z.any(),
  }),
});

// Type exports for use in application code
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
