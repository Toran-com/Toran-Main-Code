import Link from "next/link";
import { DateTile } from "@/components/date-tile";
import { Badge } from "@/components/public-shell";
import { formatEventStart, formatMiles } from "@/lib/format";
import { localePath, pageT } from "@/lib/i18n/page";
import { rolesSummary, type SevaNeed } from "@/lib/seva-needs";
import { shiftLabel } from "@/lib/seva";
import { sevaPath } from "@/lib/share";

// One event that needs volunteers, on the Seva page: when, where, which
// roles still need people and how many, and the way to its rota.
export function SevaCard({
  need,
  miles,
}: {
  need: SevaNeed;
  miles: number | null;
}) {
  const t = pageT();
  const first = need.shifts[0];
  return (
    <article className="has-card-link group flex gap-4 py-5 sm:gap-6 sm:py-6">
      <DateTile
        date={need.next_starts_at}
        label={formatEventStart(need.next_starts_at, true)}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="text-lg leading-snug font-semibold sm:text-xl">
          <Link
            href={localePath(sevaPath(need.mandir.slug, need.event.id))}
            className="card-link group-hover:text-peacock no-underline"
          >
            {need.event.title}
          </Link>
        </h3>
        {need.event.title_gu && (
          <p lang="gu" className="font-semibold">
            {need.event.title_gu}
          </p>
        )}
        <p className="text-muted">
          {need.mandir.name}
          {` · ${need.mandir.town}`}
          {miles !== null && ` · ${formatMiles(miles)}`}
        </p>
        <p className="text-muted">
          {shiftLabel(first.startsAt, first.endsAt).split(", ").at(-1)}
        </p>
        <p className="text-leaf-ink font-semibold">
          {t.count("sevaList.free", need.free)}
        </p>
        <ul className="mt-1.5 flex flex-wrap gap-2">
          {rolesSummary(need.shifts).map((r) => (
            <li key={r.role}>
              <Badge tone={r.needsDbs ? undefined : "leaf"}>
                {r.role} {r.free}
                {r.needsDbs && ` · ${t("seva.dbsNeeded")}`}
              </Badge>
            </li>
          ))}
        </ul>
      </div>
      <span
        aria-hidden="true"
        className="text-peacock mt-1 hidden shrink-0 font-semibold whitespace-nowrap sm:block"
      >
        {need.freeOnline > 0 ? t("seva.take") : t("seva.seeRota")} →
      </span>
    </article>
  );
}
