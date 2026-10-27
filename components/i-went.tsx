"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { actionPillClass } from "@/components/ui";
import { useLocale, useT } from "@/components/use-t";
import {
  forgetVisit,
  onVisitsChange,
  parseVisits,
  setWent,
  visitsSnapshot,
} from "@/lib/event-history";
import { hubPath } from "@/lib/hub";
import { enHub } from "@/lib/i18n/client/hub";

// "I went" on an event's page, once it has started: it goes into Past
// events in My Toran, on this phone only.

function subscribeMinute(update: () => void) {
  const timer = setInterval(update, 60_000);
  return () => clearInterval(timer);
}
const thisMinute = () => Math.floor(Date.now() / 60_000);
const notYet = () => null;

export function IWent({ id, at }: { id: string; at: string }) {
  const t = useT(enHub);
  const locale = useLocale();
  const minute = useSyncExternalStore(subscribeMinute, thisMinute, notYet);
  const snapshot = useSyncExternalStore(
    onVisitsChange,
    visitsSnapshot,
    () => "",
  );
  const went = useMemo(
    () => parseVisits(snapshot).some((v) => v.id === id && v.went === true),
    [snapshot, id],
  );
  if (minute === null || minute * 60_000 < Date.parse(at)) return null;
  if (went) {
    return (
      <p className="flex flex-wrap items-center gap-x-3 text-base">
        <Link href={hubPath(locale)} className="text-leaf-ink font-semibold">
          ✓ {t("hub.iWentDone")}
        </Link>
        <button
          type="button"
          onClick={() => forgetVisit(id)}
          className="text-muted cursor-pointer underline"
        >
          {t("hub.iWentUndo")}
        </button>
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setWent(id, at, true)}
      className={`${actionPillClass} self-start`}
    >
      <span aria-hidden="true">✓</span>
      {t("hub.iWent")}
    </button>
  );
}
