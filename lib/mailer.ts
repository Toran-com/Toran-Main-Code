import type { Email } from "@/lib/weekly-email";

// Sends an email through Resend (resend.com), the sender suggested for
// Supabase's login emails too (docs/app-setup.md). Needs RESEND_API_KEY
// and DIGEST_FROM ("Toran <weekly@your-domain>") in Vercel; without them
// nothing is sent.

export function mailerReady(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(env.RESEND_API_KEY && env.DIGEST_FROM);
}

export async function sendEmail(
  to: string,
  email: Email,
  env: Record<string, string | undefined> = process.env,
  send: typeof fetch = fetch,
): Promise<boolean> {
  if (!mailerReady(env)) return false;
  try {
    const response = await send("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: env.DIGEST_FROM,
        to: [to],
        subject: email.subject,
        text: email.text,
        html: email.html,
        headers: email.headers,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
