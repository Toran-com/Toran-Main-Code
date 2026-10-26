import { OpenNow } from "@/components/open-now";
import type { Json } from "@/lib/database.types";
import { formatClock, formatWeekday } from "@/lib/format";
import { pageT } from "@/lib/i18n/page";
import {
  readAartis,
  readSessions,
  WEEKDAYS,
  weekRows,
} from "@/lib/opening-hours";

// The "Open now" badge, with the times and day names it may need already
// in the page's language.
export function OpenNowBadge({ hours }: { hours: Json | null }) {
  const sessions = readSessions(hours);
  if (!sessions.length) return null;
  const times = Object.fromEntries(
    sessions
      .flatMap((s) => [s.opens, s.closes])
      .map((c) => [c, formatClock(c)]),
  );
  const days = Object.fromEntries(
    WEEKDAYS.map((d) => [d, formatWeekday(d, "long")]),
  );
  return <OpenNow sessions={sessions} times={times} days={days} />;
}

// "Opening times" on a mandir's page: the week, with days that have the
// same times run together, then the aarti times.
export function OpeningTimes({
  hours,
  aartis: aartiValue,
}: {
  hours: Json | null;
  aartis: Json | null;
}) {
  const t = pageT();
  const rows = weekRows(readSessions(hours));
  const aartis = readAartis(aartiValue);
  if (!rows.length && !aartis.length) return null;
  const days = (from: number, to: number) =>
    from === to
      ? formatWeekday(from, "short")
      : `${formatWeekday(from, "short")} – ${formatWeekday(to, "short")}`;
  return (
    <section aria-labelledby="hours-title" className="flex flex-col gap-3">
      <h2 id="hours-title" className="text-xl font-semibold">
        {t("hours.title")}
      </h2>
      {rows.length > 0 && (
        <dl className="divide-line border-line flex flex-col divide-y border-y">
          {rows.map((row) => (
            <div
              key={row.from}
              className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-3"
            >
              <dt className="text-muted">{days(row.from, row.to)}</dt>
              <dd className="text-right font-semibold">
                {row.sessions.length
                  ? row.sessions.map((s) => (
                      <span key={s.opens} className="block">
                        {formatClock(s.opens)} – {formatClock(s.closes)}
                      </span>
                    ))
                  : t("hours.closed")}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {aartis.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-muted font-semibold">{t("hours.aartis")}</h3>
          <ul className="flex flex-col gap-1">
            {aartis.map((a) => (
              <li
                key={`${a.time}-${a.name}`}
                className="flex justify-between gap-4"
              >
                <span>{a.name}</span>
                <span className="font-semibold">{formatClock(a.time)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-muted text-base">{t("hours.festivals")}</p>
    </section>
  );
}
