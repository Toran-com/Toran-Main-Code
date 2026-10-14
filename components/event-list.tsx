import Link from "next/link";
import { Badge } from "@/components/public-shell";
import { ShareButtons } from "@/components/share-buttons";
import { kindLabel, sourceLabel } from "@/lib/event-kinds";
import { formatEventStart } from "@/lib/format";
import { formatMiles } from "@/lib/geo";
import { describeRule } from "@/lib/recurrence";
import { eventPath, eventShareText } from "@/lib/share";
import type { EventNear } from "@/lib/whats-on-view";
import { groupByDay } from "@/lib/whats-on-view";
import { translator } from "@/lib/i18n";

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
  const t = translator();
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
                  {e.title_gu && (
                    <p lang="gu" className="text-lg font-semibold">
                      {e.title_gu}
                    </p>
                  )}
                  {e.status === "cancelled" && (
                    <p>
                      <Badge tone="kumkum">{t("event.cancelled")}</Badge>
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
                  {(kindLabel(e.kind) || sourceLabel(e)) && (
                    <p className="text-muted text-base">
                      {[kindLabel(e.kind), sourceLabel(e)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  {e.status !== "cancelled" && (
                    <ShareButtons
                      text={eventShareText(e, e.mandir)}
                      path={eventPath(e.mandir.slug, e.id)}
                    />
                  )}
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
