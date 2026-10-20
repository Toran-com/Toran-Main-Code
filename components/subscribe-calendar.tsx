"use client";

import { sendCount } from "@/components/count-visits";
import { useOrigin } from "@/components/use-origin";
import { useT } from "@/components/use-t";
import { enShare } from "@/lib/i18n/client/share";
import { cardClass, quietButtonClass } from "@/components/ui";

// Subscribing puts every event in the visitor's own calendar app, and keeps
// it up to date: new events appear and changes follow automatically.
export function SubscribeCalendar({
  path,
  title,
  body,
  night = false,
}: {
  path: string;
  title: string;
  body: string;
  // As a page's bold moment: deep peacock with a faint gold rangoli.
  night?: boolean;
}) {
  const t = useT(enShare);
  const origin = useOrigin();
  // One more subscription for the page it's on.
  const counted = () => sendCount("subscribe", window.location.pathname);
  const host = origin.replace(/^https?:\/\//, "");
  // Before the page's JavaScript runs there may be no address yet; the
  // plain link still downloads the calendar.
  const webcal = host ? `webcal://${host}${path}` : path;
  const google = host
    ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`
    : path;
  const button = night
    ? "bg-marigold inline-flex items-center justify-center rounded-full px-5 py-2.5 text-base font-bold text-[#1b1a2c] no-underline transition hover:brightness-105 active:scale-[0.98]"
    : quietButtonClass;
  const links = (
    <div className="flex flex-wrap gap-3">
      <a href={webcal} rel="nofollow" onClick={counted} className={button}>
        {t("subscribe.apple")}
      </a>
      <a
        href={google}
        target="_blank"
        rel="nofollow noopener"
        onClick={counted}
        className={
          night
            ? "border-on-night/30 text-on-night hover:bg-on-night/10 inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-base font-semibold no-underline transition"
            : quietButtonClass
        }
      >
        {t("subscribe.google")}
      </a>
    </div>
  );
  if (night) {
    return (
      <div className="bg-night text-on-night relative overflow-hidden rounded-3xl">
        <div
          aria-hidden="true"
          className="rangoli-art rangoli-art-night pointer-events-none absolute -top-20 -right-20 size-56 opacity-25"
        />
        <div className="relative flex flex-col gap-3 px-6 py-7 sm:px-7">
          <h2 className="font-display text-[2rem] leading-tight">{title}</h2>
          <p className="text-night-muted">{body}</p>
          {links}
          <p className="text-night-muted text-base">{t("subscribe.note")}</p>
        </div>
      </div>
    );
  }
  return (
    <div className={`${cardClass} flex flex-col gap-3 p-6 sm:p-7`}>
      <h2 className="font-display text-3xl leading-tight">{title}</h2>
      <p className="text-muted">{body}</p>
      {links}
      <p className="text-muted text-base">{t("subscribe.note")}</p>
    </div>
  );
}
