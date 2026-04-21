import { headers } from "next/headers";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { env } from "@/lib/env";
import {
  deleteUserByClerkId,
  upsertUserFromClerk,
} from "@/lib/db/queries/users";
import { captureError, logger } from "@/lib/logger";
import { sendWelcomeEmail } from "@/lib/email/resend";
import { capture, EVENTS } from "@/lib/analytics/posthog";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!env.CLERK_WEBHOOK_SIGNING_SECRET) {
    return new Response("Clerk webhook not configured", { status: 503 });
  }

  const h = await headers();
  const svixId = h.get("svix-id");
  const svixTs = h.get("svix-timestamp");
  const svixSig = h.get("svix-signature");
  if (!svixId || !svixTs || !svixSig) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(env.CLERK_WEBHOOK_SIGNING_SECRET);
  let evt: WebhookEvent;
  try {
    evt = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTs,
      "svix-signature": svixSig,
    }) as WebhookEvent;
  } catch (err) {
    logger.error({ err }, "Clerk webhook signature verification failed");
    return new Response("Invalid signature", { status: 401 });
  }

  try {
    switch (evt.type) {
      case "user.created":
      case "user.updated": {
        const d = evt.data;
        const email = d.email_addresses[0]?.email_address ?? "";
        const name = [d.first_name, d.last_name].filter(Boolean).join(" ") || null;

        await upsertUserFromClerk({
          clerkId: d.id,
          email,
          name,
          imageUrl: d.image_url,
        });

        if (evt.type === "user.created" && email && env.RESEND_API_KEY) {
          await sendWelcomeEmail({ to: email, name }).catch((err) =>
            captureError(err, { flow: "welcome-email" }),
          );
          await capture({
            distinctId: d.id,
            event: EVENTS.user_signed_up,
            properties: { email },
          }).catch(() => {});
        }
        break;
      }
      case "user.deleted": {
        if (evt.data.id) await deleteUserByClerkId(evt.data.id);
        break;
      }
    }
  } catch (err) {
    captureError(err, { type: evt.type, flow: "clerk-webhook" });
    return new Response("Handler error", { status: 500 });
  }

  return new Response(null, { status: 200 });
}
