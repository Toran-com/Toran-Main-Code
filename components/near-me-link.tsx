"use client";

import Link from "next/link";
import { type ReactNode, useSyncExternalStore } from "react";
import { readSaved } from "@/lib/place-memory";

// "Find events near me" on the home page. The first time, it opens What's
// on with "Where are you?" already asking (?pick=1), so the button does
// what it says; once this phone has chosen a place, What's on starts
// there by itself.
const noSubscribe = () => () => {};
const chosen = () => {
  const saved = readSaved();
  return Boolean(saved && "near" in saved);
};

export function NearMeLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  const known = useSyncExternalStore(noSubscribe, chosen, () => false);
  return (
    <Link href={known ? href : `${href}?pick=1`} className={className}>
      {children}
    </Link>
  );
}
