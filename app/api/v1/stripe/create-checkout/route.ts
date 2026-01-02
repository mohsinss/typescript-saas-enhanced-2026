import { NextRequest } from "next/server";
// import { getServerSession } from "next-auth"; // Not needed - auth handled by createProtectedHandler
// import { authOptions } from "@/lib/auth/next-auth"; // Not needed - auth handled by createProtectedHandler
import connectMongo from "@/lib/db/mongoose";
import User from "@/models/User";
import { createCheckoutSession } from "@/lib/payments/stripe";
import { createProtectedHandler } from "@/lib/api/handler";
import { createCheckoutSchema } from "@/lib/validation/schemas";
import { BusinessRuleError } from "@/lib/errors";
import { logger } from "@/lib/infrastructure/logger";
import config from "@/config";

/**
 * Create a Stripe checkout session
 * POST /api/v1/stripe/create-checkout
 */
export const POST = createProtectedHandler(
  async (req: NextRequest, context, data) => {
    await connectMongo();
    
    // Data is guaranteed to be defined because we have a schema
    if (!data) {
      throw new Error("Data validation failed");
    }
    
    const { priceId, successUrl, cancelUrl } = data;
    
    // Validate that the price ID exists in our config
    const plan = config.stripe.plans.find(p => p.priceId === priceId);
    if (!plan) {
      throw new BusinessRuleError("Invalid plan selected");
    }
    
    // Get user from database
    const user = await User.findById(context.session.user.id);
    
    if (!user) {
      throw new BusinessRuleError("User not found");
    }
    
    // Check if user already has an active subscription
    if (user.hasAccess && user.priceId) {
      logger.warn("User trying to checkout with existing subscription", {
        userId: user._id,
        existingPriceId: user.priceId,
        newPriceId: priceId,
      });
      throw new BusinessRuleError("You already have an active subscription");
    }
    
    // Create checkout session
    const session = await createCheckoutSession({
      priceId,
      customerId: user.customerId,
      customerEmail: user.email,
      clientReferenceId: user._id.toString(),
      successUrl: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancelUrl: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing?cancelled=true`,
      metadata: {
        userId: user._id.toString(),
        planName: plan.name,
      },
    });
    
    logger.info("Checkout session created", {
      userId: user._id,
      sessionId: session.id,
      priceId,
    });
    
    return {
      success: true,
      data: {
        url: session.url,
        sessionId: session.id,
      },
      meta: { version: "v1" },
    };
  },
  {
    schema: createCheckoutSchema,
    rateLimit: { requests: 10, window: "1h" },
  }
);
