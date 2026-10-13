import Link from "next/link";
import { Badge } from "@/components/public-shell";
import { formatEventStart } from "@/lib/format";
import { formatMiles } from "@/lib/geo";
import { describeRule } from "@/lib/recurrence";
import type { EventNear } from "@/lib/whats-on-view";
import { groupByDay } from "@/lib/whats-on-view";

// Events across mandirs, grouped by day.
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
    <div className="flex flex-col gap-8">
      {groupByDay(events, now).map(({ heading, events: day }) => (
        <section key={heading} className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-bold">{heading}</h2>
          <ul className="flex flex-col gap-3">
            {day.map((e) => (
              <li key={e.id}>
                <article className="border-line bg-surface flex flex-col gap-1 rounded-2xl border p-5">
                  <p className="text-marigold-ink font-semibold">
                    {e.recurrence && `${describeRule(e.recurrence)} · `}
                    {formatEventStart(e.next_starts_at, e.all_day)}
                  </p>
                  <h3
                    className={`text-xl font-bold ${e.status === "cancelled" ? "line-through" : ""}`}
                  >
                    {e.title}
                  </h3>
                  {e.status === "cancelled" && (
                    <p>
                      <Badge tone="kumkum">Cancelled</Badge>
                    </p>
                  )}
                  <p>
                    <Link
                      href={`/mandirs/${e.mandir.slug}`}
                      className="text-peacock font-semibold underline"
                    >
                      {e.mandir.name}
                    </Link>
                    <span className="text-muted">
                      {" "}
                      · {e.mandir.town}
                      {e.miles !== null && ` · ${formatMiles(e.miles)}`}
                    </span>
                  </p>
                  {e.summary && <p className="text-muted">{e.summary}</p>}
                </article>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export const POSTCODE_CREDIT =
  "Distances use the ONS Postcode Directory: contains OS data © Crown copyright and database right; contains Royal Mail data © Royal Mail copyright and database right; source: Office for National Statistics, licensed under the Open Government Licence v3.0.";
