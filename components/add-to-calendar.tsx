import { actionPillClass } from "@/components/ui";
import { pageT } from "@/lib/i18n/page";

// "Add to calendar" for one event: Google Calendar, or a calendar file for
// Apple, Outlook and the rest. A plain disclosure, so it works without
// JavaScript.
export function AddToCalendar({
  mandirSlug,
  eventId,
  title,
  primary = false,
}: {
  mandirSlug: string;
  eventId: string;
  title: string;
  // The main action on the event's own page: a full-width peacock button.
  primary?: boolean;
}) {
  const t = pageT();
  const query = `?event=${encodeURIComponent(eventId)}`;
  const item =
    "hover:bg-sunk text-peacock rounded-xl px-4 py-2.5 font-semibold no-underline";
  return (
    <details className={`group relative text-base ${primary ? "w-full" : ""}`}>
      <summary
        aria-label={t("calendar.addLabel", { title })}
        className={`list-none [&::-webkit-details-marker]:hidden ${
          primary
            ? "bg-peacock text-on-peacock hover:bg-peacock-deep flex w-full cursor-pointer items-center justify-center gap-2 rounded-full px-6 py-3 text-lg font-semibold transition active:scale-[0.98]"
            : actionPillClass
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={primary ? "size-5" : "size-4"}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <rect x="3.5" y="5" width="17" height="15" rx="3" />
          <path d="M3.5 10h17M8 3v4M16 3v4M12 13v4M10 15h4" />
        </svg>
        {t("calendar.add")}
      </summary>
      <div className="border-line bg-surface shadow-lift absolute top-full left-0 z-20 mt-2 flex w-max flex-col rounded-2xl border p-1.5">
        <a
          href={`/mandirs/${mandirSlug}/add-to-calendar${query}`}
          target="_blank"
          rel="nofollow noopener"
          className={item}
        >
          {t("subscribe.google")}
        </a>
        <a
          href={`/mandirs/${mandirSlug}/calendar.ics${query}`}
          rel="nofollow"
          download
          className={item}
        >
          {t("calendar.file")}
        </a>
      </div>
    </details>
  );
}
