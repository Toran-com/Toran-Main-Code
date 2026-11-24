import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import type { Database } from "@/lib/database.types";
import { formatEventStart } from "@/lib/format";
import {
  digestMessage,
  type NewEvent,
  type PushMessage,
} from "@/lib/push-digest";

// Sending phone notifications (decision 0024) with the browsers' own push
// services, signed with Toran's VAPID keys. Off unless the keys are set in
// Vercel (docs/app-setup.md): NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
// and VAPID_SUBJECT ("mailto:" an address Toran reads).

type Db = SupabaseClient<Database>;
type Env = Record<string, string | undefined>;

export function pushReady(env: Env = process.env): boolean {
  return Boolean(
    env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    env.VAPID_PRIVATE_KEY &&
    env.VAPID_SUBJECT,
  );
}

export type Subscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  mandirs: string[];
  last_digest_at?: string;
};

export type Send = (
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  options: webpush.RequestOptions,
) => Promise<unknown>;

const defaultSend: Send = (s, p, o) => webpush.sendNotification(s, p, o);

// One notification to one browser. A push address the service says is
// gone (404, 410) is deleted at once.
export async function pushTo(
  db: Db,
  sub: Subscription,
  message: PushMessage,
  env: Env = process.env,
  send: Send = defaultSend,
): Promise<"sent" | "gone" | "failed"> {
  if (!pushReady(env)) return "failed";
  try {
    await send(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(message),
      {
        vapidDetails: {
          subject: env.VAPID_SUBJECT!,
          publicKey: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
          privateKey: env.VAPID_PRIVATE_KEY!,
        },
        // Kept by the push service for up to 12 hours if the phone is off.
        TTL: 12 * 60 * 60,
        timeout: 10_000,
      },
    );
    return "sent";
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await db.from("push_subscriptions").delete().eq("id", sub.id);
      return "gone";
    }
    return "failed";
  }
}

export type PushTally = { sent: number; gone: number; failed: number };

async function inBatches<T>(
  items: T[],
  size: number,
  work: (item: T) => Promise<keyof PushTally | null>,
): Promise<PushTally> {
  const tally: PushTally = { sent: 0, gone: 0, failed: 0 };
  for (let i = 0; i < items.length; i += size) {
    const results = await Promise.all(items.slice(i, i + size).map(work));
    for (const r of results) if (r) tally[r]++;
  }
  return tally;
}

const COLUMNS = "id, endpoint, p256dh, auth, mandirs, last_digest_at";

// A committee's notice, at once, to everyone who follows the mandir with
// notifications on.
export async function notifyFollowers(
  db: Db,
  slug: string,
  message: PushMessage,
  env: Env = process.env,
  send: Send = defaultSend,
): Promise<PushTally> {
  if (!pushReady(env)) return { sent: 0, gone: 0, failed: 0 };
  const { data } = await db
    .from("push_subscriptions")
    .select(COLUMNS)
    .contains("mandirs", [slug])
    .limit(5000);
  return inBatches(data ?? [], 20, (sub) =>
    pushTo(db, sub, message, env, send),
  );
}

export type DailyPushSummary = PushTally & {
  subscriptions: number;
  newEvents: number;
  removedOld: number;
};

// Once a day, early evening: each browser gets one notification listing
// the events added since its last one at the mandirs it follows (nothing
// if none). Push addresses unused for a year are deleted.
export async function runDailyPush(
  db: Db,
  now: Date = new Date(),
  env: Env = process.env,
  send: Send = defaultSend,
): Promise<DailyPushSummary> {
  const summary: DailyPushSummary = {
    sent: 0,
    gone: 0,
    failed: 0,
    subscriptions: 0,
    newEvents: 0,
    removedOld: 0,
  };
  const yearAgo = new Date(now.getTime() - 365 * 86_400_000).toISOString();
  const { count } = await db
    .from("push_subscriptions")
    .delete({ count: "exact" })
    .lt("updated_at", yearAgo);
  summary.removedOld = count ?? 0;
  if (!pushReady(env)) return summary;

  const { data: subs } = await db
    .from("push_subscriptions")
    .select(COLUMNS)
    .limit(5000);
  const all = (subs ?? []).filter((s) => s.mandirs.length);
  summary.subscriptions = all.length;
  if (!all.length) return summary;
  const since = all
    .map((s) => s.last_digest_at!)
    .reduce((a, b) => (a < b ? a : b));

  // Events added since then, still to come, by mandir (not the daily
  // aarti, which isn't news).
  const { data: rows } = await db
    .from("events")
    .select(
      "title, starts_at, all_day, created_at, origin, mandir:mandirs!inner (slug, name)",
    )
    .eq("status", "published")
    .gte("created_at", since)
    .gte("starts_at", now.toISOString())
    .order("starts_at")
    .limit(1000);
  const events = (rows ?? []).filter((e) => e.origin !== "aarti");
  summary.newEvents = events.length;

  const tally = await inBatches(all, 20, async (sub) => {
    const news = new Map<string, { name: string; events: NewEvent[] }>();
    for (const e of events) {
      if (e.created_at <= sub.last_digest_at!) continue;
      const entry = news.get(e.mandir.slug) ?? {
        name: e.mandir.name,
        events: [],
      };
      entry.events.push({
        title: e.title,
        when: formatEventStart(e.starts_at, e.all_day),
      });
      news.set(e.mandir.slug, entry);
    }
    const message = digestMessage(sub.mandirs, news);
    return message ? pushTo(db, sub, message, env, send) : null;
  });
  Object.assign(summary, tally);
  for (let i = 0; i < all.length; i += 200) {
    await db
      .from("push_subscriptions")
      .update({ last_digest_at: now.toISOString() })
      .in(
        "id",
        all.slice(i, i + 200).map((s) => s.id),
      );
  }
  await db.from("job_runs").insert({ job: "push", summary });
  return summary;
}

// Push services browsers use: anything else isn't a real push address.
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  // Chromium builds other than Google's own Chrome.
  /^jmt\d*\.google\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^push\.services\.mozilla\.com$/,
  /^web\.push\.apple\.com$/,
  /\.push\.apple\.com$/,
  /\.notify\.windows\.com$/,
];

export type SavedSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

// A browser's subscription as sent to /api/push, checked.
export function readSubscription(value: unknown): SavedSubscription | null {
  const v = value as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  } | null;
  if (!v || typeof v.endpoint !== "string" || v.endpoint.length > 1000) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(v.endpoint);
  } catch {
    return null;
  }
  if (
    url.protocol !== "https:" ||
    !PUSH_HOSTS.some((h) => h.test(url.hostname))
  ) {
    return null;
  }
  const key = (x: unknown, min: number, max: number) =>
    typeof x === "string" &&
    x.length >= min &&
    x.length <= max &&
    /^[A-Za-z0-9_=-]+$/.test(x);
  if (!key(v.keys?.p256dh, 20, 200) || !key(v.keys?.auth, 10, 100)) {
    return null;
  }
  return {
    endpoint: v.endpoint,
    p256dh: v.keys!.p256dh as string,
    auth: v.keys!.auth as string,
  };
}
