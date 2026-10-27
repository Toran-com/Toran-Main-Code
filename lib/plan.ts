// A family's plan: events a visitor has picked, kept on their phone only
// (localStorage), never sent to Toran except as the address of the plan
// page (/plan?events=…) when they open it or send it to the family on
// WhatsApp. Nothing about the visitor is stored (decision 0006). Planned
// events are also noted in lib/event-history.ts, so My Toran can ask
// "Did you go?" once they've happened.

import { forgetPlanned, notePlanned } from "@/lib/event-history";

import type { Locale } from "@/lib/i18n";
import { withLocale } from "@/lib/i18n/paths";

const KEY = "toran:plan";
const CHANGED = "toran:plan-changed";
export const MAX_PLANNED = 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Each event, with when it next happens, so past ones can be dropped.
export type Planned = { id: string; at: string };

// Event ids, cleaned up: real-looking ones only, each once, at most
// MAX_PLANNED. From ?events= on the server.
export function cleanEventIds(value: unknown): string[] {
  const text = Array.isArray(value)
    ? value.filter((s) => typeof s === "string").join(",")
    : typeof value === "string"
      ? value
      : "";
  const ids = text
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => UUID.test(s));
  return [...new Set(ids)].slice(0, MAX_PLANNED);
}

// What's stored, as text, so it can be compared between renders.
export function planSnapshot(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

// The plan, without anything that has already happened. Nothing saved
// means nothing to work out: pages built ahead of time get an empty plan
// without asking the time.
export function parsePlan(snapshot: string, now?: Date): Planned[] {
  if (!snapshot) return [];
  let stored: unknown;
  try {
    stored = JSON.parse(snapshot);
  } catch {
    return [];
  }
  if (!Array.isArray(stored) || !stored.length) return [];
  const today = `${(now ?? new Date()).toISOString().slice(0, 10)}T00:00:00Z`;
  const seen = new Set<string>();
  return stored
    .filter(
      (p): p is Planned =>
        !!p &&
        typeof p === "object" &&
        UUID.test(String((p as Planned).id)) &&
        typeof (p as Planned).at === "string" &&
        !Number.isNaN(Date.parse((p as Planned).at)),
    )
    .filter((p) => p.at >= today && !seen.has(p.id) && !!seen.add(p.id))
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(0, MAX_PLANNED);
}

function save(plan: Planned[]) {
  try {
    if (plan.length) localStorage.setItem(KEY, JSON.stringify(plan));
    else localStorage.removeItem(KEY);
  } catch {
    // Not saved; nothing else to do.
  }
  window.dispatchEvent(new Event(CHANGED));
}

export function setPlanned(event: Planned, on: boolean) {
  const now = parsePlan(planSnapshot()).filter((p) => p.id !== event.id);
  save(on ? [...now, event] : now);
  if (on) notePlanned([event]);
  else forgetPlanned([event.id]);
}

export function addAllPlanned(events: Planned[]) {
  const now = parsePlan(planSnapshot());
  const ids = new Set(now.map((p) => p.id));
  const added = events.filter((e) => !ids.has(e.id));
  save([...now, ...added]);
  notePlanned(added);
}

export function clearPlan() {
  forgetPlanned(parsePlan(planSnapshot()).map((p) => p.id));
  save([]);
}

// Adds events to the plan as they were saved on another phone (My Toran's
// "move to a new phone"). Past ones are dropped as usual.
export function mergePlan(events: Planned[]) {
  addAllPlanned(parsePlan(JSON.stringify(events)));
}

// For useSyncExternalStore: changes here, and in other tabs.
export function onPlanChange(callback: () => void) {
  window.addEventListener(CHANGED, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGED, callback);
    window.removeEventListener("storage", callback);
  };
}

// The plan page's address for these events.
export function planHref(locale: Locale, ids: string[]): string {
  const base = withLocale("/plan", locale);
  return ids.length ? `${base}?events=${ids.join(",")}` : base;
}
