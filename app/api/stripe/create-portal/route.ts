import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth";
import connectMongo from "@/lib/db/mongoose";
import { createPortalSession } from "@/lib/payments/stripe";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions as any);

  if (session) {
    try {
      await connectMongo();

      const body = await req.json();

      const { id } = (session as any).user;

      const user = await User.findById(id);

      if (!user?.customerId) {
        return NextResponse.json(
          {
            error:
              "You don't have a billing account yet. Make a purchase first.",
          },
          { status: 400 }
        );
      } else if (!body.returnUrl) {
        return NextResponse.json(
          { error: "Return URL is required" },
          { status: 400 }
        );
      }

      const stripePortalUrl = await createPortalSession(
        user.customerId,
        body.returnUrl
      ).then(s => s.url);

      return NextResponse.json({
        url: stripePortalUrl,
      });
    } catch (e) {
      // Error logged via logger in production
      return NextResponse.json({ error: (e as Error)?.message }, { status: 500 });
    }
  } else {
    // Not Signed in
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
}
