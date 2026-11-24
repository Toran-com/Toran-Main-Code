"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { buttonClass } from "@/components/ui";
import { useLocale, useT } from "@/components/use-t";
import { enLive } from "@/lib/i18n/client/live";
import { withLocale } from "@/lib/i18n/paths";
import { liveState, type LiveEvent } from "@/lib/live-state";
import { eventPath } from "@/lib/share";

// The minute, ticking, in the browser; nothing on the server, where the
// page is built ahead of time (as components/open-now.tsx).
function subscribe(update: () => void) {
  const timer = setInterval(update, 30_000);
  return () => clearInterval(timer);
}
const minute = () => Math.floor(Date.now() / 60_000);
const never = () => null;

function useNow(): number | null {
  const now = useSyncExternalStore(subscribe, minute, never);
  return now === null ? null : now * 60_000;
}

function useTitle() {
  const locale = useLocale();
  return (e: LiveEvent) => (locale === "gu" && e.title_gu) || e.title;
}

// The /live page: what's on now, then later today, worked out on the
// visitor's phone each minute (decision 0026).
export function LiveNow({ events }: { events: LiveEvent[] }) {
  const t = useT(enLive);
  const now = useNow();
  if (now === null) return null;
  const { now: on, later } = liveState(events, now);
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="live-now" className="flex flex-col gap-4">
        <h2
          id="live-now"
          className="flex items-center gap-3 text-2xl font-semibold"
        >
          <span aria-hidden="true" className="bg-kumkum size-3 rounded-full" />
          {t("live.now")}
        </h2>
        {on.length ? (
          <ul className="divide-line flex flex-col divide-y">
            {on.map((e) => (
              <LiveRow key={`${e.id}-${e.starts_at}`} event={e} on />
            ))}
          </ul>
        ) : (
          <p className="text-muted text-lg">{t("live.nothingNow")}</p>
        )}
      </section>
      <section aria-labelledby="live-later" className="flex flex-col gap-4">
        <h2 id="live-later" className="text-2xl font-semibold">
          {t("live.later")}
        </h2>
        {later.length ? (
          <ul className="divide-line flex flex-col divide-y">
            {later.map((e) => (
              <LiveRow key={`${e.id}-${e.starts_at}`} event={e} on={false} />
            ))}
          </ul>
        ) : (
          <p className="text-muted text-lg">{t("live.nothingLater")}</p>
        )}
      </section>
    </div>
  );
}

function LiveRow({ event, on }: { event: LiveEvent; on: boolean }) {
  const t = useT(enLive);
  const locale = useLocale();
  const title = useTitle();
  const labels = event.labels;
  const when =
    event.all_day || !labels
      ? t("live.allDay")
      : on
        ? `${t("live.started", { time: labels.start })}, ${t("live.until", {
            time: labels.end,
          })}`
        : t("live.from", { time: labels.start });
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-4">
      <Link
        href={withLocale(eventPath(event.mandir.slug, event.id), locale)}
        className="text-ink flex min-w-0 flex-[1_1_16rem] flex-col no-underline"
      >
        <span className="text-xl font-semibold">{title(event)}</span>
        <span className="text-muted">
          {event.mandir.name}, {event.mandir.town} · {when}
        </span>
      </Link>
      {on && event.mandir.live_url && (
        <a
          href={event.mandir.live_url}
          rel="noopener"
          className={`${buttonClass} text-center no-underline sm:w-auto`}
        >
          {t("live.watch")}
        </a>
      )}
    </li>
  );
}

// A line on the home page while something is on: what, where, and a link
// to the rest. Nothing at all when nothing is.
export function LiveStrip({
  events,
  href,
}: {
  events: LiveEvent[];
  href: string;
}) {
  const t = useT(enLive);
  const now = useNow();
  const title = useTitle();
  if (now === null) return null;
  const on = liveState(events, now).now;
  if (on.length === 0) return null;
  const [first] = on;
  return (
    <Link
      href={href}
      className="border-line bg-surface text-ink flex flex-col gap-1 rounded-3xl border px-5 py-4 no-underline"
    >
      <span className="text-kumkum flex items-center gap-2 font-semibold">
        <span aria-hidden="true" className="bg-kumkum size-2.5 rounded-full" />
        {t("live.stripLabel")}
      </span>
      <span className="text-lg font-semibold">
        {title(first)}, {first.mandir.name}
        {on.length > 1 && ` ${t("live.stripMore", { count: on.length - 1 })}`}
      </span>
      <span className="text-peacock font-semibold">
        {t("live.stripOpen")} →
      </span>
    </Link>
  );
}
