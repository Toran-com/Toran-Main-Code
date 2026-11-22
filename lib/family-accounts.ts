import { cleanSlugs } from "@/lib/follow";
import { cleanEventIds, type Planned } from "@/lib/plan";

// Family accounts (decision 0020): cleaning up and combining the saved
// lists. Whether they are switched on is in lib/family-flag.ts.
export { FAMILY_ACCOUNTS } from "@/lib/family-flag";

export type FamilySaved = { following: string[]; plan: Planned[] };

// A plan from anywhere (the account, or a request), cleaned up: real event
// ids with a real date, each once, at most 30.
export function cleanPlanned(value: unknown): Planned[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: Planned[] = [];
  for (const p of value) {
    if (!p || typeof p !== "object") continue;
    const id = cleanEventIds(String((p as Planned).id ?? ""))[0];
    const at = String((p as Planned).at ?? "");
    if (!id || seen.has(id) || Number.isNaN(Date.parse(at))) continue;
    seen.add(id);
    out.push({ id, at: at.slice(0, 40) });
  }
  return out.slice(0, 30);
}

export function cleanSaved(value: unknown): FamilySaved {
  const v = (value && typeof value === "object" ? value : {}) as Partial<
    Record<keyof FamilySaved, unknown>
  >;
  return { following: cleanSlugs(v.following), plan: cleanPlanned(v.plan) };
}

// What a device should hold after logging in, for an account that agreed
// to keep its lists. The first time a device meets the account, nothing
// is lost: what's on the phone and what's in the account are put
// together. After that, the account is the record (every change on a
// device is saved to it straight away), so a mandir unfollowed on the
// laptop is unfollowed on the phone too. (An account with nothing saved,
// because it hasn't agreed or deleted what it saved, isn't combined at
// all: lib/family-sync-run.ts leaves the phone as it is.)
export function combineSaved(
  device: FamilySaved,
  account: FamilySaved | null,
  firstTime: boolean,
): FamilySaved {
  if (!firstTime) return account ?? { following: [], plan: [] };
  if (!account) return device;
  return cleanSaved({
    following: [...device.following, ...account.following],
    plan: [...device.plan, ...account.plan],
  });
}

// Changes made on this device while the account was loading (say, Follow
// pressed as the page opened) are newer than what the account sent back,
// so they're kept: whatever was added on the device since `before` is
// added to `next`, and whatever was taken off is taken off.
export function keepChangesSince(
  before: FamilySaved,
  now: FamilySaved,
  next: FamilySaved,
): FamilySaved {
  const followed = now.following.filter((s) => !before.following.includes(s));
  const unfollowed = before.following.filter((s) => !now.following.includes(s));
  const ids = (list: Planned[]) => new Set(list.map((p) => p.id));
  const had = ids(before.plan);
  const has = ids(now.plan);
  const planned = now.plan.filter((p) => !had.has(p.id));
  const unplanned = new Set(
    before.plan.filter((p) => !has.has(p.id)).map((p) => p.id),
  );
  if (
    !followed.length &&
    !unfollowed.length &&
    !planned.length &&
    !unplanned.size
  ) {
    return next;
  }
  return cleanSaved({
    following: [
      ...next.following.filter((s) => !unfollowed.includes(s)),
      ...followed,
    ],
    plan: [...next.plan.filter((p) => !unplanned.has(p.id)), ...planned],
  });
}
