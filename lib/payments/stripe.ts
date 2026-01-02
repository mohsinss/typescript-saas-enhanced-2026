// @ts-ignore - Stripe types
import Stripe from "stripe";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/infrastructure/logger";

// Initialize Stripe with typed configuration
const stripe = new Stripe(env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
});

/**
 * Find a Stripe Checkout session by ID
 */
export async function findCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session | null> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "customer"],
    });
    
    logger.info("Retrieved checkout session", { sessionId });
    return session;
  } catch (error) {
    logger.error("Failed to retrieve checkout session", error, { sessionId });
    return null;
  }
}

/**
 * Create a Stripe Checkout session
 */
export async function createCheckoutSession(params: {
  priceId: string;
  customerId?: string;
  customerEmail?: string;
  clientReferenceId?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Checkout.Session> {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      customer: params.customerId,
      customer_email: params.customerEmail,
      client_reference_id: params.clientReferenceId,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
    });
    
    logger.info("Created checkout session", { 
      sessionId: session.id,
      customerId: params.customerId 
    });
    
    return session;
  } catch (error) {
    logger.error("Failed to create checkout session", error, params);
    throw error;
  }
}

/**
 * Create a Stripe Customer Portal session
 */
export async function createPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    
    logger.info("Created portal session", { customerId });
    return session;
  } catch (error) {
    logger.error("Failed to create portal session", error, { customerId });
    throw error;
  }
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    
    logger.info("Cancelled subscription", { subscriptionId });
    return subscription;
  } catch (error) {
    logger.error("Failed to cancel subscription", error, { subscriptionId });
    throw error;
  }
}

export { stripe };
