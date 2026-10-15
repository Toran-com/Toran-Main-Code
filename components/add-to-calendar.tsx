// "Add to calendar" for one event: Google Calendar, or a calendar file for
// Apple, Outlook and the rest. A plain disclosure, so it works without
// JavaScript.
export function AddToCalendar({
  mandirSlug,
  eventId,
  title,
}: {
  mandirSlug: string;
  eventId: string;
  title: string;
}) {
  const query = `?event=${encodeURIComponent(eventId)}`;
  const item =
    "hover:bg-sunk text-peacock rounded-lg px-3 py-2 font-semibold no-underline";
  return (
    <details className="group text-base">
      <summary
        aria-label={`Add to calendar: ${title}`}
        className="border-peacock/30 text-peacock hover:bg-peacock/10 inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full border px-3 py-1 font-semibold transition duration-200 hover:-translate-y-0.5 active:scale-95 [&::-webkit-details-marker]:hidden"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <rect x="3.5" y="5" width="17" height="15" rx="3" />
          <path d="M3.5 10h17M8 3v4M16 3v4M12 13v4M10 15h4" />
        </svg>
        Add to calendar
      </summary>
      <div className="border-line bg-surface shadow-lift mt-2 flex w-fit flex-col rounded-xl border p-1">
        <a
          href={`/mandirs/${mandirSlug}/add-to-calendar${query}`}
          target="_blank"
          rel="nofollow noopener"
          className={item}
        >
          Google Calendar
        </a>
        <a
          href={`/mandirs/${mandirSlug}/calendar.ics${query}`}
          rel="nofollow"
          download
          className={item}
        >
          Apple, Outlook or another calendar
        </a>
      </div>
    </details>
  );
}
