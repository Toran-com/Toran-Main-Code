"use client";

import { useSyncExternalStore } from "react";
import { useT } from "@/components/use-t";
import { enShare } from "@/lib/i18n/client/share";
import { londonDate } from "@/lib/london";

const noSubscribe = () => () => {};

// "In 20 days", "Tomorrow" or "Today" for a date (YYYY-MM-DD), worked out
// on the visitor's phone so a saved page never shows a stale count. Shows
// nothing before the page's JavaScript runs, or once the day has passed.
export function Countdown({ date }: { date: string }) {
  const t = useT(enShare);
  const today = useSyncExternalStore(
    noSubscribe,
    () => londonDate(),
    () => null,
  );
  if (!today) return null;
  const days = Math.round(
    (new Date(`${date}T00:00:00Z`).getTime() -
      new Date(`${today}T00:00:00Z`).getTime()) /
      86_400_000,
  );
  if (days < 0) return null;
  const text =
    days === 0
      ? t("day.today")
      : days === 1
        ? t("day.tomorrow")
        : t("countdown.days", { days });
  return (
    <span className="bg-marigold/15 text-marigold-ink rounded-full px-3 py-0.5 text-base font-bold">
      {text}
    </span>
  );
}
