// The events a visitor has been to, for "Past events" in My Toran. Kept on
// their phone only (localStorage), like the plan: an event's id, when it
// was, and whether they went. Events join it when they're added to the
// plan (so My Toran can ask "Did you go?" afterwards) or when someone
// presses "I went" on an event's page. Nothing is sent to Toran except the
// ids, to look up the events' names (decision 0006).

const KEY = "toran:been";
const CHANGED = "toran:been-changed";
export const MAX_VISITS = 200;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// "went" is missing until they say: true for "I went", false for "No".
export type Visit = { id: string; at: string; went?: boolean };

export function visitsSnapshot(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

// Real-looking entries only, one per event, newest first.
export function parseVisits(snapshot: string): Visit[] {
  if (!snapshot) return [];
  let stored: unknown;
  try {
    stored = JSON.parse(snapshot);
  } catch {
    return [];
  }
  if (!Array.isArray(stored)) return [];
  const byId = new Map<string, Visit>();
  for (const v of stored) {
    if (!v || typeof v !== "object") continue;
    const { id, at, went } = v as Record<string, unknown>;
    if (typeof id !== "string" || !UUID.test(id)) continue;
    if (typeof at !== "string" || Number.isNaN(Date.parse(at))) continue;
    byId.set(id, typeof went === "boolean" ? { id, at, went } : { id, at });
  }
  return [...byId.values()]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MAX_VISITS);
}

function save(visits: Visit[]) {
  const kept = parseVisits(JSON.stringify(visits));
  try {
    if (kept.length) localStorage.setItem(KEY, JSON.stringify(kept));
    else localStorage.removeItem(KEY);
  } catch {
    // Not saved; nothing else to do.
  }
  window.dispatchEvent(new Event(CHANGED));
}

// Events added to the plan: remembered, so My Toran can ask about them
// once they've happened. An answer already given is kept.
export function notePlanned(events: { id: string; at: string }[]) {
  const now = parseVisits(visitsSnapshot());
  const known = new Set(now.map((v) => v.id));
  const fresh = events.filter((e) => !known.has(e.id));
  if (fresh.length) save([...now, ...fresh.map(({ id, at }) => ({ id, at }))]);
}

// Events taken out of the plan before they happen: forgotten here too,
// unless the visitor already said they went.
export function forgetPlanned(ids: string[], now = new Date()) {
  const drop = new Set(ids);
  const stamp = now.toISOString();
  const visits = parseVisits(visitsSnapshot());
  const kept = visits.filter(
    (v) => !(drop.has(v.id) && v.went === undefined && v.at >= stamp),
  );
  if (kept.length !== visits.length) save(kept);
}

export function setWent(id: string, at: string, went: boolean) {
  const others = parseVisits(visitsSnapshot()).filter((v) => v.id !== id);
  save([...others, { id, at, went }]);
}

export function forgetVisit(id: string) {
  save(parseVisits(visitsSnapshot()).filter((v) => v.id !== id));
}

// Past events saved on another phone (My Toran's "move to a new phone").
// An answer already given on this phone wins.
export function mergeVisits(incoming: Visit[]) {
  const here = parseVisits(visitsSnapshot());
  const known = new Map(here.map((v) => [v.id, v]));
  for (const v of incoming) {
    const mine = known.get(v.id);
    if (!mine || (mine.went === undefined && v.went !== undefined)) {
      known.set(v.id, v);
    }
  }
  save([...known.values()]);
}

export function clearVisits() {
  save([]);
}

// For useSyncExternalStore: changes here, and in other tabs.
export function onVisitsChange(callback: () => void) {
  window.addEventListener(CHANGED, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGED, callback);
    window.removeEventListener("storage", callback);
  };
}

// Events that have started, split into the ones they went to and the ones
// still to ask about. "No" answers aren't shown again.
export function pastVisits(
  visits: Visit[],
  now: Date,
): { went: Visit[]; ask: Visit[] } {
  const stamp = now.toISOString();
  const past = visits.filter((v) => v.at <= stamp);
  return {
    went: past.filter((v) => v.went === true),
    ask: past.filter((v) => v.went === undefined),
  };
}
