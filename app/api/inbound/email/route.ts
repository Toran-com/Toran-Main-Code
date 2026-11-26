import { after, type NextRequest } from "next/server";
import {
  handleInboundEmail,
  inboundEmailOn,
  verifyWebhook,
} from "@/lib/inbound-email";
import { sendEmail } from "@/lib/mailer";
import { siteUrl } from "@/lib/site";
import { createRobotClient } from "@/lib/supabase/robot";

// POST /api/inbound/email: Resend's webhook for an email forwarded to a
// mandir's Toran address (decision 0031). Only Resend can call it: each
// request is signed with RESEND_WEBHOOK_SECRET. It answers straight away
// and reads the email afterwards (lib/inbound-email.ts), so Resend doesn't
// wait; an email delivered twice is read once.
export const maxDuration = 120;

const ok = (body: Record<string, unknown>) =>
  Response.json(body, { headers: { "cache-control": "no-store" } });

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET ?? "";
  const body = await request.text();
  const signed = verifyWebhook(
    body,
    {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    },
    secret,
  );
  if (!signed) return new Response("Not found", { status: 404 });

  let event: { type?: unknown; data?: { email_id?: unknown } };
  try {
    event = JSON.parse(body);
  } catch {
    return ok({ skipped: "Not JSON" });
  }
  const emailId = event.data?.email_id;
  if (event.type !== "email.received" || typeof emailId !== "string") {
    return ok({ skipped: "Not a received email" });
  }
  if (!inboundEmailOn())
    return ok({ skipped: "Forwarding isn't switched on." });
  const db = createRobotClient();
  if (!db) {
    // Resend tries again later.
    return Response.json(
      { error: "SUPABASE_SECRET_KEY or the database isn't set up" },
      { status: 503 },
    );
  }
  const { data: arrived, error } = await db.rpc("inbound_email_arrived", {
    target: emailId,
  });
  if (error) return Response.json({ error: "Try again" }, { status: 503 });
  if (!arrived) return ok({ skipped: "Already read" });

  const site = siteUrl();
  after(async () => {
    try {
      await handleInboundEmail(db, emailId, {
        siteUrl: site,
        reply: (to, email) => sendEmail(to, email),
      });
    } catch (failure) {
      console.error("Reading a forwarded email failed", failure);
    }
  });
  return ok({ reading: true });
}
