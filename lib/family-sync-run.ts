// The work behind components/family-sync.tsx (decision 0020), downloaded
// only when family accounts are on and someone is logged in: fetch what the
// account holds, put it together with this phone's (lib/family-accounts.ts
// says how), then save every change here to the account. start() returns
// a function that stops it. An account that hasn't agreed to Toran keeping
// its lists has nothing saved and nothing read: start() just says so
// (lib/family-state.ts), and My Toran asks; agree() is the yes.
import {
  agreeToFamilySaving,
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
import { AGREED, setFamilyState, SYNCED } from "@/lib/family-state";
import {
  clearPlan,
  mergePlan,
  onPlanChange,
  parsePlan,
  planSnapshot,
} from "@/lib/plan";

const device = () => ({
  following: parseFollowing(followingSnapshot()),
  plan: parsePlan(planSnapshot()),
});

// Saves to the account, never failing loudly: a phone that loses its
// signal (or is put away) mid-save tries again once it's back online.
// Whatever's on the phone stays as it is either way.
function saveQuietly(value: ReturnType<typeof device>) {
  void saveFamilySaved(value)
    .then((ok) => {
      if (!ok) retryWhenOnline();
    })
    .catch(retryWhenOnline);
}

let retrying = false;
function retryWhenOnline() {
  if (retrying) return;
  retrying = true;
  window.addEventListener(
    "online",
    () => {
      retrying = false;
      saveQuietly(device());
    },
    { once: true },
  );
}

export function start(): () => void {
  let stop = () => {};
  let cancelled = false;
  let applying = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  // No signal: leave the phone as it is; the next page load tries again.
  void loadFamilySaved()
    .catch(() => null)
    .then((loaded) => {
      if (cancelled || !loaded) return;
      if (!loaded.saved) {
        // Not agreed (or agreed and later deleted it): keep nothing, and
        // leave what's on this phone as it is.
        try {
          localStorage.removeItem(SYNCED);
        } catch {
          // Nothing to forget.
        }
        setFamilyState("ask");
        return;
      }
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
      saveQuietly(next);
      setFamilyState("on");
      // From now on, each change here goes to the account.
      const save = () => {
        if (applying) return;
        clearTimeout(timer);
        timer = setTimeout(() => saveQuietly(device()), 600);
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

// The family ticked the box: put this phone's lists on the account, then
// tell components/family-sync.tsx to start keeping them in step.
export async function agree(): Promise<boolean> {
  const ok = await agreeToFamilySaving(true, device()).catch(() => false);
  if (ok) window.dispatchEvent(new Event(AGREED));
  return ok;
}
