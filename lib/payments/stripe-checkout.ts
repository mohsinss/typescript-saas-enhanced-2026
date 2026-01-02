// @ts-ignore - Stripe types
import Stripe from "stripe";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/infrastructure/logger";

const stripe = new Stripe(env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-02-24.acacia",
});

/**
 * Create a Stripe Checkout session
 * This is used by the legacy API route
 */
export async function createCheckout({
  priceId,
  mode,
  successUrl,
  cancelUrl,
  clientReferenceId,
  user,
  couponId,
}: {
  priceId: string;
  mode: "payment" | "subscription";
  successUrl: string;
  cancelUrl: string;
  clientReferenceId?: string;
  user?: any;
  couponId?: string;
}) {
  try {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: clientReferenceId,
    };

    if (user) {
      if (user.customerId) {
        params.customer = user.customerId;
      } else {
        params.customer_email = user.email;
      }
    }

    if (couponId) {
      params.discounts = [{ coupon: couponId }];
    }

    const session = await stripe.checkout.sessions.create(params);
    
    logger.info("Checkout session created", {
      sessionId: session.id,
      mode,
      priceId,
    });

    return session.url;
  } catch (error) {
    logger.error("Failed to create checkout session", error);
    throw error;
  }
}

export { findCheckoutSession } from "./stripe";
