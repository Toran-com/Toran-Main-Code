"use client";

import { useEffect } from "react";
import { FAMILY_ACCOUNTS } from "@/lib/family-flag";

// Family accounts (decision 0020): keeps My Toran's followed mandirs and
// plan the same on every device a family logs in on
// (lib/family-sync-run.ts). Does nothing while family accounts are
// switched off, or for a visitor who isn't logged in; then its code isn't
// even downloaded.
const loggedIn = () => /(^|;\s*)sb-[^=]+-auth-token/.test(document.cookie);

export function FamilySync() {
  useEffect(() => {
    if (!FAMILY_ACCOUNTS || !loggedIn()) return;
    let stop = () => {};
    let gone = false;
    void import("@/lib/family-sync-run").then(({ start }) => {
      if (!gone) stop = start();
    });
    return () => {
      gone = true;
      stop();
    };
  }, []);
  return null;
}
