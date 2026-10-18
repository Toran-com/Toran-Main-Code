"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { countablePath, type Metric } from "@/lib/stats";

// Tells Toran's own counter about a visit, a share or a calendar
// subscription (lib/stats.ts): just the page's address, no cookies and
// nothing about the visitor. Never gets in the way if it fails.
export function sendCount(metric: Metric, path: string) {
  const page = countablePath(path);
  if (!page) return;
  try {
    const body = JSON.stringify({ m: metric, p: page });
    if (navigator.sendBeacon?.("/api/count", body)) return;
    void fetch("/api/count", { method: "POST", body, keepalive: true }).catch(
      () => {},
    );
  } catch {
    // Counting is never worth an error.
  }
}

// Counts each public page seen, including moves between pages without a
// full reload. Admin and committee pages aren't counted.
export function CountVisits() {
  const pathname = usePathname();
  useEffect(() => {
    sendCount("view", pathname);
  }, [pathname]);
  return null;
}
