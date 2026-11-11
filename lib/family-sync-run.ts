// The work behind components/family-sync.tsx (decision 0020), downloaded
// only when family accounts are on and someone is logged in: fetch what the
// account holds, put it together with this phone's (lib/family-accounts.ts
// says how), then save every change here to the account. start() returns
// a function that stops it.
import {
  loadFamilySaved,
  saveFamilySaved,
} from "@/app/(public)/(directory)/my/actions";
import { combineSaved } from "@/lib/family-accounts";
import {
  clearFollowing,
  followingSnapshot,
  mergeFollowing,
  onFollowingChange,
  parseFollowing,
} from "@/lib/follow";
import {
  clearPlan,
  mergePlan,
  onPlanChange,
  parsePlan,
  planSnapshot,
} from "@/lib/plan";

const SYNCED = "toran:account-synced";
const device = () => ({
  following: parseFollowing(followingSnapshot()),
  plan: parsePlan(planSnapshot()),
});

export function start(): () => void {
  let stop = () => {};
  let cancelled = false;
  let applying = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  void loadFamilySaved().then((loaded) => {
    if (cancelled || !loaded) return;
    let synced: string | null = null;
    try {
      synced = localStorage.getItem(SYNCED);
    } catch {
      // Storage blocked: treat as the first time, which loses nothing.
    }
    const here = device();
    const next = combineSaved(here, loaded.saved, synced !== loaded.userId);
    if (JSON.stringify(next) !== JSON.stringify(here)) {
      applying = true;
      clearFollowing();
      mergeFollowing(next.following);
      clearPlan();
      mergePlan(next.plan);
      applying = false;
    }
    try {
      localStorage.setItem(SYNCED, loaded.userId);
    } catch {
      // Fine: next time counts as a first time again.
    }
    void saveFamilySaved(next);
    // From now on, each change here goes to the account.
    const save = () => {
      if (applying) return;
      clearTimeout(timer);
      timer = setTimeout(() => void saveFamilySaved(device()), 600);
    };
    const offFollow = onFollowingChange(save);
    const offPlan = onPlanChange(save);
    stop = () => {
      offFollow();
      offPlan();
      clearTimeout(timer);
    };
  });
  return () => {
    cancelled = true;
    stop();
  };
}
