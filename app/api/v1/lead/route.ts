import { NextRequest } from "next/server";
import connectMongo from "@/lib/db/mongoose";
import Lead from "@/models/Lead";
import { createPublicHandler } from "@/lib/api/handler";
import { createLeadSchema } from "@/lib/validation/schemas";
import { sendWelcomeEmail } from "@/lib/email/mailgun";
import { logger } from "@/lib/infrastructure/logger";
// import { ConflictError } from "@/lib/errors"; // Not currently used

/**
 * Create a new lead
 * POST /api/v1/lead
 */
export const POST = createPublicHandler(
  async (req: NextRequest, context, data) => {
    await connectMongo();
    
    // Data is guaranteed to be defined because we have a schema
    if (!data) {
      throw new Error("Data validation failed");
    }
    
    // Check if lead already exists
    const existingLead = await Lead.findOne({ email: data.email });
    
    if (existingLead) {
      logger.info("Lead already exists", { email: data.email });
      // Return success to prevent email enumeration
      return {
        success: true,
        data: { message: "Thank you for your interest!" },
      };
    }
    
    // Create new lead
    const lead = await Lead.create({
      email: data.email,
      name: data.name,
      source: data.source || "website",
      metadata: data.metadata,
    });
    
    logger.info("New lead created", { 
      leadId: lead._id, 
      email: data.email 
    });
    
    // Send welcome email (async, don't wait)
    sendWelcomeEmail(data.email, data.name).catch((error) => {
      logger.error("Failed to send welcome email", error, { 
        email: data.email 
      });
    });
    
    return {
      success: true,
      data: { 
        message: "Thank you for your interest! Check your email for more information." 
      },
    };
  },
  {
    schema: createLeadSchema,
    rateLimit: { 
      requests: 5, 
      window: "1h" // Max 5 signups per hour per IP
    },
  }
);
