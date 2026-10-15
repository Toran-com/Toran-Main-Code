"use client";

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

// Before the page's JavaScript runs, links use the live site's address
// (Vercel provides it at build time); after, the address actually in use,
// so preview links point at the preview.
const builtOrigin = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
  : "";

export function useOrigin(): string {
  return useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => builtOrigin,
  );
}
