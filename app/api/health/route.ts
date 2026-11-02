import { connection } from "next/server";
import { EnvError } from "@/lib/env";
import { checkHealth } from "@/lib/health";
import { mailerReady } from "@/lib/mailer";
import { sentryOptions } from "@/lib/observability";
import { createPublicServerClient } from "@/lib/supabase/server";
import { weeklyEmailOn } from "@/lib/weekly-email";

// GET /api/health: is the site up, and does the database answer?
// 200 when everything is fine, 503 otherwise. Also says whether the
// nightly and weekly jobs are running and whether errors reach Sentry,
// which don't change the status code. Used by the hourly uptime check
// (.github/workflows/uptime.yml).
export async function GET() {
  await connection(); // always check live, never serve a saved answer

  let client: ReturnType<typeof createPublicServerClient> | "misconfigured";
  try {
    client = createPublicServerClient();
  } catch (error) {
    if (!(error instanceof EnvError)) throw error;
    client = "misconfigured";
  }

  const health = await checkHealth(client, new Date(), {
    weeklyOn: weeklyEmailOn() && mailerReady(),
    errorReports: sentryOptions().enabled,
  });
  return Response.json(health, {
    status: health.status === "ok" ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}
