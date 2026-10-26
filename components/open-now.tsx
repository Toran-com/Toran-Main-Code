"use client";

import { useSyncExternalStore } from "react";
import { useT } from "@/components/use-t";
import { enHours } from "@/lib/i18n/client/hours";
import { openState, type Session } from "@/lib/opening-hours";

// The minute, ticking, in the browser; nothing on the server, where the
// page is built ahead of time and "now" would be out of date.
function subscribe(update: () => void) {
  const timer = setInterval(update, 30_000);
  return () => clearInterval(timer);
}
const minute = () => Math.floor(Date.now() / 60_000);
const never = () => null;

// "Open now · until 12pm" or "Closed now · opens at 4pm", worked out on
// the visitor's phone in UK time. Times and day names come ready
// formatted in the page's language.
export function OpenNow({
  sessions,
  times,
  days,
}: {
  sessions: Session[];
  times: Record<string, string>;
  days: Record<number, string>;
}) {
  const t = useT(enHours);
  const now = useSyncExternalStore(subscribe, minute, never);
  if (now === null) return null;
  const state = openState(sessions, new Date(now * 60_000));
  if (!state) return null;
  const detail = state.open
    ? t("hours.until", { time: times[state.closes] })
    : state.inDays === 0
      ? t("hours.opensToday", { time: times[state.opens] })
      : state.inDays === 1
        ? t("hours.opensTomorrow", { time: times[state.opens] })
        : t("hours.opensOn", {
            day: days[state.day],
            time: times[state.opens],
          });
  return (
    <p
      className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-base font-semibold ${
        state.open ? "bg-leaf-tint text-leaf-ink" : "bg-sunk text-ink"
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-2.5 rounded-full ${state.open ? "bg-leaf" : "bg-muted"}`}
      />
      {state.open ? t("hours.openNow") : t("hours.closedNow")} · {detail}
    </p>
  );
}
