import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requireStripe } from "@/lib/payments/stripe";
import { env } from "@/lib/env";
import { getSubscriptionByClerkId } from "@/lib/db/queries/subscriptions";
import { normalizeError } from "@/lib/api/errors";

export const runtime = "nodejs";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 },
      );

    const sub = await getSubscriptionByClerkId(userId);
    if (!sub?.subscription.stripeCustomerId) {
      return NextResponse.json(
        { error: { code: "NO_CUSTOMER", message: "No Stripe customer for this user" } },
        { status: 400 },
      );
    }

    const stripe = requireStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.subscription.stripeCustomerId,
      return_url: `${env.NEXT_PUBLIC_APP_URL}/billing`,
    });

    return NextResponse.json({ data: { url: session.url } });
  } catch (err) {
    const n = normalizeError(err);
    return NextResponse.json(
      { error: { code: n.code, message: n.message, details: n.details } },
      { status: n.status },
    );
  }
}
