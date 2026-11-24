import type { NextRequest } from "next/server";
import { countablePath, type Counted, isBot, isCounted } from "@/lib/stats";
import { createPublicServerClient } from "@/lib/supabase/server";

// Whether to count this request at all: not when the browser asks not to
// be tracked, and not for search engines or link previews. Only these
// headers are read, and nothing is kept.
export function wantsCounting(request: NextRequest): boolean {
  return !(
    request.headers.get("dnt") === "1" ||
    request.headers.get("sec-gpc") === "1" ||
    isBot(request.headers.get("user-agent"))
  );
}

// Adds one to today's count for a public page (lib/stats.ts): a visit, a
// calendar add or share, or a press of Follow, Unfollow, Ask or I went.
export async function recordCount(metric: unknown, path: unknown) {
  const page = countablePath(path);
  if (!isCounted(metric) || !page) return;
  try {
    const db = createPublicServerClient();
    await db?.rpc("count_visit", { what: metric satisfies Counted, page });
  } catch {
    // Counting never gets in the way of the page.
  }
}
