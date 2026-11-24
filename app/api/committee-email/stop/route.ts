import type { NextRequest } from "next/server";
import { checkStopCode } from "@/lib/committee-monthly-send";
import { createRobotClient } from "@/lib/supabase/robot";

// POST /api/committee-email/stop?u=…&m=…&c=…: an email program's own
// "Unsubscribe" button (List-Unsubscribe-Post) on the monthly committee
// email. Stops it at once, for that member and mandir. The same answer
// either way.
export async function POST(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const u = q.get("u");
  const m = q.get("m");
  if (checkStopCode(u, m, q.get("c"))) {
    const db = createRobotClient();
    await db?.rpc("set_committee_email", {
      member: u!,
      target: m!,
      wanted: false,
    });
  }
  return new Response("Unsubscribed.", {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
