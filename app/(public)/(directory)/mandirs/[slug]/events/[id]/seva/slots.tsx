"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useOrigin } from "@/components/use-origin";
import { buttonClass } from "@/components/ui";
import { calendarFile, googleCalendarLink } from "@/lib/ical";
import { giveBackSlot, takeSlot } from "./actions";
import { useT } from "@/components/use-t";

// The slots this phone has taken. Toran keeps no names (decision 0013), so
// the only record of who took a slot is here, in the browser's storage:
// enough to show "You're on Kitchen", add it to a calendar and give it back.

export type MySlot = {
  slot: string;
  shift: string;
  event: string;
  role: string;
  label: string;
  starts_at: string;
  ends_at: string;
  title: string;
  place: string;
  path: string;
};

const KEY = "toran:seva-slots";
const CHANGED = "toran:seva-slots-changed";
const NONE: MySlot[] = [];

let lastRaw: string | null = null;
let lastSlots: MySlot[] = NONE;

function read(): MySlot[] {
  let raw = "[]";
  try {
    raw = localStorage.getItem(KEY) ?? "[]";
  } catch {
    // Storage can be blocked (private browsing); then nothing is kept.
  }
  if (raw !== lastRaw) {
    lastRaw = raw;
    try {
      const parsed: unknown = JSON.parse(raw);
      lastSlots = Array.isArray(parsed) ? (parsed as MySlot[]) : NONE;
    } catch {
      lastSlots = NONE;
    }
  }
  return lastSlots;
}

function write(slots: MySlot[]) {
  // Forget slots more than a week after their shift ended.
  const cutoff = Date.now() - 7 * 86_400_000;
  const kept = slots.filter((s) => Date.parse(s.ends_at) > cutoff);
  try {
    localStorage.setItem(KEY, JSON.stringify(kept));
  } catch {
    // Nothing more we can do; the slot is still taken.
  }
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

function useMySlots(): MySlot[] {
  return useSyncExternalStore(subscribe, read, () => NONE);
}

const MESSAGES = {
  full: "slot.full",
  closed: "slot.closed",
  failed: "slot.failed",
} as const;

// "Take this slot" for one shift.
export function TakeSlot({
  slug,
  details,
  full,
}: {
  slug: string;
  details: Omit<MySlot, "slot">;
  full: boolean;
}) {
  const t = useT();
  const mine = useMySlots().some((s) => s.shift === details.shift);
  const [state, action, pending] = useActionState(takeSlot, null);
  // Each slot is saved once, so giving it back later isn't undone when the
  // page refreshes.
  const saved = useRef<string | null>(null);

  useEffect(() => {
    if (state?.ok && saved.current !== state.slot) {
      saved.current = state.slot;
      write([...read(), { ...details, slot: state.slot }]);
    }
  }, [state, details]);

  if (mine) {
    return (
      <p className="text-peacock font-semibold" role="status">
        {t("slot.youreOn")}
      </p>
    );
  }
  if (full)
    return <p className="text-muted font-semibold">{t("slot.isFull")}</p>;
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="shift" value={details.shift} />
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        disabled={pending}
        aria-label={t("slot.takeLabel", {
          role: details.role,
          label: details.label,
        })}
        className={`${buttonClass} w-auto px-4 py-2 text-base`}
      >
        {pending ? t("slot.taking") : t("slot.take")}
      </button>
      {state && !state.ok && (
        <p className="text-kumkum text-base" role="alert">
          {t(MESSAGES[state.error])}
        </p>
      )}
    </form>
  );
}

// The slots this phone has taken for one event, with calendar links and
// "I can't make it".
export function MySlots({ slug, event }: { slug: string; event: string }) {
  const t = useT();
  const slots = useMySlots().filter((s) => s.event === event);
  if (!slots.length) return null;
  return (
    <section
      aria-labelledby="my-slots"
      className="border-peacock/30 bg-peacock/5 flex flex-col gap-3 rounded-2xl border p-5"
    >
      <h2 id="my-slots" className="font-display text-2xl font-bold">
        {t("slot.yours")}
      </h2>
      <ul className="flex flex-col gap-4">
        {slots.map((s) => (
          <MySlotItem key={s.slot} slug={slug} slot={s} />
        ))}
      </ul>
      <p className="text-muted text-base">{t("slot.onlyYourPhone")}</p>
    </section>
  );
}

function MySlotItem({ slug, slot }: { slug: string; slot: MySlot }) {
  const t = useT();
  const origin = useOrigin();
  const [busy, setBusy] = useState(false);
  const entry = {
    uid: `seva-${slot.slot}@toran`,
    title: `Seva: ${slot.role} (${slot.title})`,
    location: slot.place,
    url: `${origin}${slot.path}`,
    start: slot.starts_at,
    end: slot.ends_at,
    allDay: false,
  };

  function downloadFile() {
    const blob = new Blob([calendarFile("Seva", [entry])], {
      type: "text/calendar",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "seva.ics";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // Give it back first, then forget it on this phone, so the rota already
  // shows the freed place when "You're on" disappears.
  async function cantMakeIt() {
    setBusy(true);
    try {
      await giveBackSlot(slot.slot, slug);
    } finally {
      write(read().filter((s) => s.slot !== slot.slot));
      setBusy(false);
    }
  }

  const link = "text-peacock font-semibold underline cursor-pointer";
  return (
    <li className="flex flex-col gap-1">
      <p className="text-lg font-bold">
        {t("slot.youreOnRole", { role: slot.role, label: slot.label })}
      </p>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-base">
        <a
          href={googleCalendarLink(entry)}
          target="_blank"
          rel="noopener"
          className={link}
        >
          {t("subscribe.google")}
        </a>
        <button type="button" onClick={downloadFile} className={link}>
          {t("subscribe.apple")}
        </button>
        <button
          type="button"
          onClick={cantMakeIt}
          disabled={busy}
          className="text-kumkum cursor-pointer font-semibold underline"
        >
          {busy ? t("slot.givingBack") : t("slot.cantMakeIt")}
        </button>
      </p>
    </li>
  );
}
