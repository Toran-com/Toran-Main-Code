import type { NextRequest } from "next/server";
import { countablePath, isBot, isMetric, type Metric } from "@/lib/stats";
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

// Adds one to today's count for a public page (lib/stats.ts).
export async function recordCount(metric: unknown, path: unknown) {
  const page = countablePath(path);
  if (!isMetric(metric) || !page) return;
  try {
    const db = createPublicServerClient();
    await db?.rpc("count_visit", { what: metric satisfies Metric, page });
  } catch {
    // Counting never gets in the way of the page.
  }
}
