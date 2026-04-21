import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { captureError } from "@/lib/logger";

export const runtime = "nodejs";

async function handler(req: Request) {
  try {
    const { job, payload } = (await req.json()) as { job: string; payload: unknown };

    switch (job) {
      case "send-welcome-email": {
        const { sendWelcomeEmail } = await import("@/lib/email/resend");
        await sendWelcomeEmail(payload as { to: string; name: string | null });
        break;
      }
      default:
        return new Response(`Unknown job: ${job}`, { status: 400 });
    }

    return new Response(null, { status: 200 });
  } catch (err) {
    captureError(err, { flow: "qstash-handler" });
    return new Response("Handler error", { status: 500 });
  }
}

export const POST = verifySignatureAppRouter(handler);
