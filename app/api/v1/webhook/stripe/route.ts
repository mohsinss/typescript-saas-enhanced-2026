import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
// @ts-ignore - Stripe types
import Stripe from "stripe";
import connectMongo from "@/lib/db/mongoose";
import config from "@/config";
import User from "@/models/User";
import { findCheckoutSession, stripe } from "@/lib/payments/stripe";
import { logger } from "@/lib/infrastructure/logger";
import { sendReceiptEmail, sendCancellationEmail } from "@/lib/email/mailgun";
import { env } from "@/lib/config/env";

const webhookSecret = env.STRIPE_WEBHOOK_SECRET!;

/**
 * Stripe webhook handler
 * POST /api/v1/webhook/stripe
 */
export async function POST(req: NextRequest) {
  await connectMongo();

  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    logger.warn("Stripe webhook missing signature");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const error = err as Error;
    logger.error("Webhook signature verification failed", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const eventType = event.type;
  logger.info("Stripe webhook received", { 
    eventType, 
    eventId: event.id 
  });

  try {
    switch (eventType) {
      case "checkout.session.completed": {
        const stripeObject = event.data.object as Stripe.Checkout.Session;
        const session = await findCheckoutSession(stripeObject.id);
        
        if (!session) {
          logger.error("Checkout session not found", undefined, { 
            sessionId: stripeObject.id 
          });
          break;
        }

        const customerId = session.customer as string;
        const priceId = session.line_items?.data[0]?.price?.id;
        const userId = stripeObject.client_reference_id;
        const plan = config.stripe.plans.find((p) => p.priceId === priceId);

        if (!plan) {
          logger.error("Plan not found for price", undefined, { priceId });
          break;
        }

        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        let user;

        if (userId) {
          user = await User.findById(userId);
        } else if (customer.email) {
          user = await User.findOne({ email: customer.email });

          if (!user) {
            user = await User.create({
              email: customer.email,
              name: customer.name,
            });
            await user.save();
          }
        }

        if (!user) {
          logger.error("No user found for checkout session", undefined, {
            userId,
            customerEmail: customer.email,
          });
          throw new Error("No user found");
        }

        // Update user with subscription data
        user.priceId = priceId;
        user.customerId = customerId;
        user.hasAccess = true;
        await user.save();

        logger.info("User subscription activated", {
          userId: user._id,
          priceId,
          customerId,
        });

        // Send receipt email
        if (customer.email) {
          await sendReceiptEmail(
            customer.email,
            session.amount_total || plan.price * 100,
            plan.name
          );
        }

        break;
      }

      case "checkout.session.expired": {
        const stripeObject = event.data.object as Stripe.Checkout.Session;
        logger.info("Checkout session expired", { 
          sessionId: stripeObject.id,
          customerEmail: stripeObject.customer_email,
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logger.info("Subscription updated", {
          subscriptionId: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });
        
        // Handle subscription changes if needed
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const user = await User.findOne({ customerId: subscription.customer });

        if (user) {
          user.hasAccess = false;
          await user.save();

          logger.info("User subscription cancelled", {
            userId: user._id,
            customerId: subscription.customer,
          });

          // Send cancellation email
          if (user.email && subscription.canceled_at) {
            const endDate = new Date(subscription.canceled_at * 1000);
            await sendCancellationEmail(user.email, endDate);
          }
        }

        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const priceId = invoice.lines.data[0]?.price?.id;
        const customerId = invoice.customer as string;

        const user = await User.findOne({ customerId });

        if (user && user.priceId === priceId) {
          user.hasAccess = true;
          await user.save();

          logger.info("Invoice paid - access granted", {
            userId: user._id,
            invoiceId: invoice.id,
          });
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logger.warn("Invoice payment failed", {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          attemptCount: invoice.attempt_count,
        });
        
        // We don't immediately revoke access - Stripe will retry
        // Access will be revoked when subscription is deleted
        break;
      }

      default:
        logger.debug("Unhandled webhook event type", { eventType });
    }
  } catch (error) {
    logger.error("Stripe webhook processing error", error, { 
      eventType,
      eventId: event.id 
    });
    // Return 200 to prevent Stripe from retrying
  }

  return NextResponse.json({ received: true });
}
