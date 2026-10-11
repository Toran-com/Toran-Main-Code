import { connection } from "next/server";
import { EnvError } from "@/lib/env";
import { checkHealth } from "@/lib/health";
import { createPublicServerClient } from "@/lib/supabase/server";

// GET /api/health: is the site up, and does the database answer?
// 200 when everything is fine, 503 otherwise. Used by the uptime check.
export async function GET() {
  await connection(); // always check live, never serve a saved answer

  let client: ReturnType<typeof createPublicServerClient> | "misconfigured";
  try {
    client = createPublicServerClient();
  } catch (error) {
    if (!(error instanceof EnvError)) throw error;
    client = "misconfigured";
  }

  const health = await checkHealth(client);
  return Response.json(health, {
    status: health.status === "ok" ? 200 : 503,
    headers: { "cache-control": "no-store" },
  });
}
