import { NextRequest } from "next/server";
import connectMongo from "@/lib/db/mongoose";
import User from "@/models/User";
import { createPortalSession } from "@/lib/payments/stripe";
import { createProtectedHandler } from "@/lib/api/handler";
import { BusinessRuleError } from "@/lib/errors";
import { logger } from "@/lib/infrastructure/logger";

/**
 * Create a Stripe customer portal session
 * POST /api/v1/stripe/create-portal
 */
export const POST = createProtectedHandler(
  async (req: NextRequest, context) => {
    await connectMongo();
    
    // Get user from database
    const user = await User.findById(context.session.user.id);
    
    if (!user) {
      throw new BusinessRuleError("User not found");
    }
    
    if (!user.customerId) {
      throw new BusinessRuleError("No subscription found");
    }
    
    // Create portal session
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;
    const session = await createPortalSession(user.customerId, returnUrl);
    
    logger.info("Portal session created", {
      userId: user._id,
      customerId: user.customerId,
    });
    
    return {
      success: true,
      data: {
        url: session.url,
      },
      meta: { version: "v1" },
    };
  },
  {
    rateLimit: { requests: 10, window: "1h" },
    requireSubscription: true,
  }
);
