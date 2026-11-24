import { connection, type NextRequest } from "next/server";
import { cleanSlugs } from "@/lib/follow";
import { pushReady, readSubscription } from "@/lib/push";
import { createPublicServerClient } from "@/lib/supabase/server";

// POST /api/push {subscription, mandirs}: turn phone notifications on (or
// change which mandirs). DELETE /api/push {endpoint}: turn them off, which
// deletes the push address at once (decision 0024).
export async function POST(request: NextRequest) {
  await connection();
  if (!pushReady()) return new Response(null, { status: 404 });
  let body: { subscription?: unknown; mandirs?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // Not ours.
  }
  const sub = readSubscription(body.subscription);
  if (!sub) return new Response(null, { status: 400 });
  const db = createPublicServerClient();
  const { error } = db
    ? await db.rpc("save_push_subscription", {
        target_endpoint: sub.endpoint,
        key_p256dh: sub.p256dh,
        key_auth: sub.auth,
        slugs: cleanSlugs(body.mandirs),
      })
    : { error: true };
  return new Response(null, { status: error ? 503 : 204 });
}

export async function DELETE(request: NextRequest) {
  await connection();
  let body: { endpoint?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    // Not ours.
  }
  if (typeof body.endpoint === "string" && body.endpoint.length <= 1000) {
    const db = createPublicServerClient();
    await db?.rpc("drop_push_subscription", {
      target_endpoint: body.endpoint,
    });
  }
  return new Response(null, { status: 204 });
}
