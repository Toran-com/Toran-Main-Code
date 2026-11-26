import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import {
  apiLimiter,
  hashApiKey,
  bearerKey,
  keyMandir,
  type KeyMandir,
} from "@/lib/events-api";
import { createRobotClient } from "@/lib/supabase/robot";

// What every events API route does first (decision 0032): checks the key,
// keeps each key to its share of requests, and answers in JSON that
// nobody caches.

type Robot = NonNullable<ReturnType<typeof createRobotClient>>;

export function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function withKey(
  request: NextRequest,
  act: (db: Robot, mandir: KeyMandir) => Promise<Response>,
): Promise<Response> {
  const header = request.headers.get("authorization");
  const key = bearerKey(header);
  if (!key) {
    return json(
      { error: "Send your Toran key as: Authorization: Bearer toran_…" },
      401,
    );
  }
  if (!apiLimiter.allow("events-api", hashApiKey(key))) {
    return Response.json(
      { error: "Too many requests. Wait a few minutes and try again." },
      {
        status: 429,
        headers: { "retry-after": "600", "cache-control": "no-store" },
      },
    );
  }
  const db = createRobotClient();
  if (!db) return json({ error: "Toran's database isn't set up here." }, 503);
  const mandir = await keyMandir(db, header);
  if (!mandir) {
    return json(
      { error: "That key isn't working. Ask your committee for a new one." },
      401,
    );
  }
  return act(db, mandir);
}

// The mandir's page and What's on show the change straight away.
export function refresh(mandir: KeyMandir): void {
  revalidateTag(`mandir:${mandir.slug}`, { expire: 0 });
  revalidateTag("events", { expire: 0 });
}

// The request's JSON body, or null if it isn't JSON.
export async function bodyOf(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
