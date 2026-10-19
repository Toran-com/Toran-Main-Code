import Link from "next/link";
import { Badge } from "@/components/public-shell";
import { kindLabel, sourceLabel } from "@/lib/event-kinds";
import { formatTimeOfDay } from "@/lib/format";
import { formatMiles } from "@/lib/geo";
import { describeRule } from "@/lib/recurrence";
import { eventPath } from "@/lib/share";
import type { EventNear } from "@/lib/whats-on-view";
import { groupByDay } from "@/lib/whats-on-view";
import { translator } from "@/lib/i18n";

// Events across mandirs, grouped by day. Each card opens the event's own
// page, which has "Add to calendar" and sharing; the list stays easy to
// scan on a phone.
// Pass "now" on pages rendered per visit, so headings can say "Today";
// leave it out on saved (static) pages.
export function EventList({
  events,
  now = null,
}: {
  events: EventNear[];
  now?: Date | null;
}) {
  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {groupByDay(events, now).map(({ heading, events: day }) => (
        <section key={heading} className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-bold sm:text-2xl">
            {heading}
          </h2>
          <ul className="rise-list flex flex-col gap-3">
            {day.map((e) => (
              <li key={e.id}>
                <EventCard event={e} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function EventCard({ event: e }: { event: EventNear }) {
  const t = translator();
  const cancelled = e.status === "cancelled";
  const rule = e.recurrence && describeRule(e.recurrence);
  const source = sourceLabel(e);
  return (
    <article className="has-card-link group border-line bg-surface lift shadow-card flex gap-3 rounded-2xl border p-4 sm:gap-5 sm:p-5">
      <p className="text-marigold-ink w-14 shrink-0 pt-0.5 leading-tight font-bold sm:w-20 sm:text-lg">
        {formatTimeOfDay(e.next_starts_at, e.all_day)}
      </p>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3
          className={`text-lg leading-snug font-bold sm:text-xl ${cancelled ? "line-through" : ""}`}
        >
          <Link
            href={eventPath(e.mandir.slug, e.id)}
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
          <span className="text-ink font-semibold">{e.mandir.name}</span>
          {` · ${e.mandir.town}`}
          {e.miles !== null && ` · ${formatMiles(e.miles)}`}
        </p>
        {e.summary && <p className="text-muted line-clamp-2">{e.summary}</p>}
        <p className="mt-1 flex flex-wrap items-center gap-2">
          {cancelled && <Badge tone="kumkum">{t("event.cancelled")}</Badge>}
          {rule && <Badge tone="marigold">{rule}</Badge>}
          {kindLabel(e.kind) && <Badge>{kindLabel(e.kind)}</Badge>}
          {source && (
            <span
              className={`text-base ${e.confirmed_at ? "text-peacock font-semibold" : "text-muted"}`}
            >
              {e.confirmed_at && <span aria-hidden="true">✓ </span>}
              {source}
            </span>
          )}
        </p>
      </div>
    </article>
  );
}

export const POSTCODE_CREDIT =
  "Distances use the ONS Postcode Directory: contains OS data © Crown copyright and database right; contains Royal Mail data © Royal Mail copyright and database right; source: Office for National Statistics, licensed under the Open Government Licence v3.0.";
