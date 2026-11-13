import { FAMILY_ACCOUNTS } from "@/lib/family-flag";

// Whether this browser's mandirs and plan are being kept on a family
// account (decision 0020). That needs family accounts switched on, someone
// logged in, and the family to have agreed (the box on My Toran): only
// then does the account hold a row for them. lib/family-sync-run.ts finds
// out and says so here; the follow buttons and My Toran show it.
//
//   "off"      not switched on, or nobody is logged in
//   "checking" logged in, not yet known whether they've agreed
//   "ask"      logged in, hasn't agreed: nothing is saved to the account
//   "on"       agreed: every change here is saved to the account

export type FamilyState = "off" | "checking" | "ask" | "on";

// Set once this browser has put its lists together with an account: the
// account's user id. Also read by lib/family-sync-run.ts.
export const SYNCED = "toran:account-synced";
const CHANGED = "toran:family-state";
// Sent when the family agrees, so lib/family-sync-run.ts starts saving.
export const AGREED = "toran:family-agreed";

const loggedIn = () => /(^|;\s*)sb-[^=]+-auth-token/.test(document.cookie);
let known: "ask" | "on" | null = null;

export function familyState(): FamilyState {
  if (!FAMILY_ACCOUNTS || !loggedIn()) return "off";
  if (known) return known;
  try {
    if (localStorage.getItem(SYNCED)) return "on";
  } catch {
    // Storage blocked: wait for the account to say.
  }
  return "checking";
}

export function setFamilyState(state: "ask" | "on") {
  known = state;
  window.dispatchEvent(new Event(CHANGED));
}

export function onFamilyState(listener: () => void): () => void {
  window.addEventListener(CHANGED, listener);
  return () => window.removeEventListener(CHANGED, listener);
}

// For useSyncExternalStore on the server and before hydration.
export const familyStateOnServer = (): FamilyState => "off";
