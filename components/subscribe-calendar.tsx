"use client";

import { useOrigin } from "@/components/use-origin";
import { cardClass, quietButtonClass } from "@/components/ui";

// Subscribing puts every event in the visitor's own calendar app, and keeps
// it up to date: new events appear and changes follow automatically.
export function SubscribeCalendar({
  path,
  title,
  body,
}: {
  path: string;
  title: string;
  body: string;
}) {
  const origin = useOrigin();
  const host = origin.replace(/^https?:\/\//, "");
  // Before the page's JavaScript runs there may be no address yet; the
  // plain link still downloads the calendar.
  const webcal = host ? `webcal://${host}${path}` : path;
  const google = host
    ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`
    : path;
  return (
    <div className={`${cardClass} flex flex-col gap-3 p-5`}>
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <p className="text-muted">{body}</p>
      <div className="flex flex-wrap gap-3">
        <a href={webcal} rel="nofollow" className={quietButtonClass}>
          Apple or Outlook calendar
        </a>
        <a
          href={google}
          target="_blank"
          rel="nofollow noopener"
          className={quietButtonClass}
        >
          Google Calendar
        </a>
      </div>
      <p className="text-muted text-base">
        No account needed. You can remove it from your calendar at any time.
      </p>
    </div>
  );
}
