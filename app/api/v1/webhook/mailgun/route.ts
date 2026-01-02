import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { logger } from "@/lib/infrastructure/logger";
import { env } from "@/lib/config/env";

/**
 * Verify Mailgun webhook signature
 */
function verifyWebhookSignature(
  timestamp: string,
  token: string,
  signature: string
): boolean {
  if (!env.MAILGUN_API_KEY) {
    return false;
  }

  const encodedToken = crypto
    .createHmac("sha256", env.MAILGUN_API_KEY)
    .update(timestamp.concat(token))
    .digest("hex");

  return encodedToken === signature;
}

/**
 * Mailgun webhook handler
 * POST /api/v1/webhook/mailgun
 */
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  
  const timestamp = formData.get("timestamp") as string;
  const token = formData.get("token") as string;
  const signature = formData.get("signature") as string;
  const event = formData.get("event") as string;

  // Verify webhook signature
  if (!verifyWebhookSignature(timestamp, token, signature)) {
    logger.warn("Invalid Mailgun webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const eventData = {
    event,
    recipient: formData.get("recipient") as string,
    domain: formData.get("domain") as string,
    messageId: formData.get("Message-Id") as string,
    timestamp,
  };

  logger.info("Mailgun webhook received", eventData);

  try {
    switch (event) {
      case "delivered":
        logger.info("Email delivered", {
          recipient: eventData.recipient,
          messageId: eventData.messageId,
        });
        break;

      case "opened":
        logger.info("Email opened", {
          recipient: eventData.recipient,
          messageId: eventData.messageId,
        });
        break;

      case "clicked":
        logger.info("Email link clicked", {
          recipient: eventData.recipient,
          messageId: eventData.messageId,
          url: formData.get("url") as string,
        });
        break;

      case "complained":
        logger.warn("Email marked as spam", {
          recipient: eventData.recipient,
          messageId: eventData.messageId,
        });
        // TODO: Handle spam complaints - maybe unsubscribe user
        break;

      case "unsubscribed":
        logger.info("User unsubscribed", {
          recipient: eventData.recipient,
        });
        // TODO: Update user preferences in database
        break;

      case "failed":
      case "bounced":
        logger.error("Email delivery failed", undefined, {
          recipient: eventData.recipient,
          messageId: eventData.messageId,
          error: formData.get("error") as string,
          code: formData.get("code") as string,
        });
        // TODO: Handle bounces - maybe mark email as invalid
        break;

      default:
        logger.debug("Unhandled Mailgun event", { event });
    }
  } catch (error) {
    logger.error("Mailgun webhook processing error", error, eventData);
    // Return 200 to prevent Mailgun from retrying
  }

  return NextResponse.json({ received: true });
}
