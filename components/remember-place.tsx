"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { placeHref, readSaved, savePlace } from "@/lib/place-memory";

// Starts a page near the place this phone chose before (on What's on or
// here), and remembers a postcode typed on the page ("remember", from the
// form's hidden field). Shows nothing.
export function RememberPlace({
  page,
  near,
  within,
  status,
  keep = "",
  remember = false,
}: {
  page: string;
  near: string;
  within: number;
  // Whether the postcode in the address was found.
  status: "none" | "found" | "unknown" | "unavailable";
  // The visitor's other choices, as a query string.
  keep?: string;
  remember?: boolean;
}) {
  const router = useRouter();
  useEffect(() => {
    const saved = readSaved();
    if (remember) {
      if (status === "found") savePlace({ near: near.toUpperCase(), within });
      router.replace(placeHref(page, keep, { near, within }), {
        scroll: false,
      });
      return;
    }
    if (status === "unknown" && saved && "near" in saved && saved.near === near)
      savePlace(null);
    if (!near && saved && "near" in saved) {
      router.replace(placeHref(page, keep, saved), { scroll: false });
    }
  }, [page, near, within, status, keep, remember, router]);
  return null;
}
