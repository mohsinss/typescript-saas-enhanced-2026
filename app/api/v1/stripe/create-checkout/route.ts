import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requireStripe } from "@/lib/payments/stripe";
import { env } from "@/lib/env";
import { createCheckoutSchema } from "@/lib/validation/schemas";
import { getUserByClerkId } from "@/lib/db/queries/users";
import { capture, EVENTS } from "@/lib/analytics/posthog";
import { normalizeError } from "@/lib/api/errors";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const parsed = createCheckoutSchema.parse(body);

    const stripe = requireStripe();
    const dbUser = await getUserByClerkId(userId);
    const clerk = await currentUser();
    const email = dbUser?.email ?? clerk?.emailAddresses[0]?.emailAddress;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: parsed.priceId, quantity: 1 }],
      customer_email: email,
      client_reference_id: userId,
      metadata: { clerkUserId: userId },
      subscription_data: { metadata: { clerkUserId: userId } },
      success_url: parsed.successUrl ?? `${env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
      cancel_url: parsed.cancelUrl ?? `${env.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    await capture({
      distinctId: userId,
      event: EVENTS.checkout_started,
      properties: { priceId: parsed.priceId },
    }).catch(() => {});

    return NextResponse.json({ data: { url: session.url } });
  } catch (err) {
    const n = normalizeError(err);
    return NextResponse.json(
      { error: { code: n.code, message: n.message, details: n.details } },
      { status: n.status },
    );
  }
}
