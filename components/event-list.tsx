import Link from "next/link";
import { DateTile, TimeTile } from "@/components/date-tile";
import { Badge } from "@/components/public-shell";
import { kindLabel, sourceLabel } from "@/lib/event-kinds";
import { formatEventStart, formatMiles, formatTimeOfDay } from "@/lib/format";
import { describeRule } from "@/lib/recurrence";
import { eventPath } from "@/lib/share";
import type { EventNear } from "@/lib/whats-on-view";
import { groupByDay, longDayHeading } from "@/lib/whats-on-view";
import { pageT, localePath } from "@/lib/i18n/page";

// Events across mandirs, grouped by day. Each row opens the event's own
// page, which has "Add to calendar" and sharing. Rows sit on the page with
// a fine line between them, so the list stays calm and easy to scan.
// Pass "now" on pages rendered per visit, so headings can say "Today";
// leave it out on saved (static) pages. With "more", each day shows at
// most that many events and links to the rest of the day.
export function EventList({
  events,
  now = null,
  more,
}: {
  events: EventNear[];
  now?: Date | null;
  more?: { perDay: number; href: (day: string) => string };
}) {
  const t = pageT();
  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      {groupByDay(events, now).map(({ day, heading, events: all }) => {
        const shown = more ? all.slice(0, more.perDay) : all;
        return (
          <section key={day} className="flex flex-col">
            <h2 className="text-marigold-ink text-base font-semibold tracking-[0.12em] uppercase">
              {heading}
            </h2>
            <ul className="divide-line flex flex-col divide-y">
              {shown.map((e) => (
                <li key={e.id}>
                  <EventCard event={e} underDay />
                </li>
              ))}
            </ul>
            {more && shown.length < all.length && (
              <p className="border-line border-t pt-4">
                <Link
                  href={more.href(day)}
                  className="text-peacock font-semibold"
                >
                  {t("whatsOn.moreOnDay", {
                    count: all.length,
                    day: longDayHeading(day),
                  })}
                </Link>
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}

// Under a day heading ("underDay") the tile shows the time, since the
// date would only repeat the heading.
export function EventCard({
  event: e,
  underDay = false,
}: {
  event: EventNear;
  underDay?: boolean;
}) {
  const t = pageT();
  const cancelled = e.status === "cancelled";
  const rule = e.recurrence && describeRule(e.recurrence);
  const source = sourceLabel(e);
  const kind = kindLabel(e.kind);
  return (
    <article className="has-card-link group flex gap-4 py-5 sm:gap-6 sm:py-6">
      {underDay ? (
        <TimeTile at={e.next_starts_at} allDay={e.all_day} />
      ) : (
        <DateTile
          date={e.next_starts_at}
          label={formatEventStart(e.next_starts_at, true)}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3
          className={`text-lg leading-snug font-semibold sm:text-xl ${cancelled ? "line-through" : ""}`}
        >
          <Link
            href={localePath(eventPath(e.mandir.slug, e.id))}
            className="card-link group-hover:text-peacock no-underline"
          >
            {e.title}
          </Link>
        </h3>
        {e.title_gu && (
          <p lang="gu" className="font-semibold">
            {e.title_gu}
          </p>
        )}
        <p className="text-muted">
          {e.mandir.name}
          {` · ${e.mandir.town}`}
          {e.miles !== null && ` · ${formatMiles(e.miles)}`}
        </p>
        {underDay ? (
          (rule || kind) && (
            <p className="text-muted">
              {[rule, kind].filter(Boolean).join(" · ")}
            </p>
          )
        ) : (
          <p className="text-muted">
            {formatTimeOfDay(e.next_starts_at, e.all_day)}
            {rule && ` · ${rule}`}
            {kind && ` · ${kind}`}
          </p>
        )}
        {e.summary && <p className="text-muted line-clamp-2">{e.summary}</p>}
        {(cancelled || source) && (
          <p className="text-muted mt-1 flex flex-wrap items-center gap-x-2 text-base">
            {cancelled && <Badge tone="kumkum">{t("event.cancelled")}</Badge>}
            {source &&
              (e.confirmed_at ? (
                <span className="text-leaf-ink font-semibold">
                  <span aria-hidden="true">✓ </span>
                  {source}
                </span>
              ) : (
                <span>{source}</span>
              ))}
          </p>
        )}
      </div>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="text-peacock mt-1 hidden size-6 shrink-0 transition-transform group-hover:translate-x-1 sm:block"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </article>
  );
}

export const POSTCODE_CREDIT =
  "Distances use the ONS Postcode Directory: contains OS data © Crown copyright and database right; contains Royal Mail data © Royal Mail copyright and database right; source: Office for National Statistics, licensed under the Open Government Licence v3.0.";
