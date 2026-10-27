// The seva a visitor has done, for "My seva" in My Toran. A taken slot is
// kept on the phone until a week after its shift (components/seva-slots.tsx);
// once the shift has ended it's copied here, so the record of seva done
// stays after that. On the phone only: Toran keeps no names (decision 0013).

const KEY = "toran:seva-done";
const CHANGED = "toran:seva-done-changed";
export const MAX_DONE = 300;

// What a taken slot says about itself. Its random id stays, so the same
// shift is only counted once.
export type DoneShift = {
  slot: string;
  role: string;
  label: string;
  title: string;
  place: string;
  path: string;
  starts_at: string;
  ends_at: string;
};

const FIELDS = [
  "slot",
  "role",
  "label",
  "title",
  "place",
  "path",
  "starts_at",
  "ends_at",
] as const;

export function doneSnapshot(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function clean(value: unknown): DoneShift | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!FIELDS.every((f) => typeof v[f] === "string")) return null;
  const shift = Object.fromEntries(
    FIELDS.map((f) => [f, (v[f] as string).slice(0, 300)]),
  ) as DoneShift;
  if (
    !shift.slot ||
    Number.isNaN(Date.parse(shift.starts_at)) ||
    Number.isNaN(Date.parse(shift.ends_at)) ||
    // Only the shift's own page on Toran.
    !/^\/(gu\/)?mandirs\/[a-z0-9-]+\//.test(shift.path)
  ) {
    return null;
  }
  return shift;
}

// Real-looking shifts only, each once, newest first.
export function parseDone(snapshot: string): DoneShift[] {
  if (!snapshot) return [];
  let stored: unknown;
  try {
    stored = JSON.parse(snapshot);
  } catch {
    return [];
  }
  if (!Array.isArray(stored)) return [];
  const bySlot = new Map<string, DoneShift>();
  for (const value of stored) {
    const shift = clean(value);
    if (shift) bySlot.set(shift.slot, shift);
  }
  return [...bySlot.values()]
    .sort((a, b) => b.starts_at.localeCompare(a.starts_at))
    .slice(0, MAX_DONE);
}

function save(shifts: DoneShift[]) {
  const kept = parseDone(JSON.stringify(shifts));
  try {
    if (kept.length) localStorage.setItem(KEY, JSON.stringify(kept));
    else localStorage.removeItem(KEY);
  } catch {
    // Not saved; nothing else to do.
  }
  window.dispatchEvent(new Event(CHANGED));
}

// Copies taken slots whose shift has ended into the record. Returns
// whether anything new was added.
export function keepEnded(slots: DoneShift[], now = new Date()): boolean {
  const done = parseDone(doneSnapshot());
  const known = new Set(done.map((s) => s.slot));
  const ended = slots
    .map(clean)
    .filter(
      (s): s is DoneShift =>
        !!s && !known.has(s.slot) && Date.parse(s.ends_at) <= now.getTime(),
    );
  if (!ended.length) return false;
  save([...done, ...ended]);
  return true;
}

// "I didn't do this one": taken out of the record.
export function forgetDone(slot: string) {
  save(parseDone(doneSnapshot()).filter((s) => s.slot !== slot));
}

export function clearDone() {
  save([]);
}

export function onDoneChange(callback: () => void) {
  window.addEventListener(CHANGED, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGED, callback);
    window.removeEventListener("storage", callback);
  };
}

// The mandir a shift was at, from its page's address.
export function shiftMandir(shift: { path: string }): string {
  return /\/mandirs\/([^/]+)\//.exec(shift.path)?.[1] ?? "";
}

// Hours of a shift, to the nearest half hour, and never negative.
export function shiftHours(shift: { starts_at: string; ends_at: string }) {
  const ms = Date.parse(shift.ends_at) - Date.parse(shift.starts_at);
  return ms > 0 ? Math.round(ms / 1_800_000) / 2 : 0;
}
