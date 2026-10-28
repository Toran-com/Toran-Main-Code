import type { MessageKey } from "@/lib/i18n";
import { pageT } from "@/lib/i18n/page";
import { groupFacilities } from "@/lib/visiting";

// "Visiting" on a mandir's page: what the committee has ticked (a
// step-free way in, chairs, a hearing loop, food) and their note. Shown
// only when there's something to say.
export function VisitingInfo({
  facilities,
  note,
  phone,
}: {
  facilities: readonly string[];
  note: string | null;
  phone: string | null;
}) {
  const t = pageT();
  const groups = groupFacilities(facilities);
  if (!groups.length && !note) return null;
  return (
    <section
      id="visiting"
      aria-labelledby="visiting-title"
      className="flex scroll-mt-28 flex-col gap-3"
    >
      <h2 id="visiting-title" className="text-xl font-semibold">
        {t("visit.title")}
      </h2>
      {groups.map(({ group, items }) => (
        <div key={group} className="flex flex-col gap-1.5">
          <h3 className="text-muted font-semibold">{t(`visit.${group}`)}</h3>
          <TickList
            items={items.map((item) => t(`visit.${item}` as MessageKey))}
          />
        </div>
      ))}
      {note && <p className="whitespace-pre-line">{note}</p>}
      {phone && (
        <p className="text-muted text-base">
          {t("visit.askFirst")}{" "}
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="text-peacock font-semibold underline"
          >
            {phone}
          </a>
        </p>
      )}
    </section>
  );
}

// The same ticks, for an event's page.
export function visitingItems(facilities: readonly string[]): string[] {
  const t = pageT();
  return groupFacilities(facilities)
    .flatMap(({ items }) => items)
    .map((item) => t(`visit.${item}` as MessageKey));
}

// A short list of ticks.
export function TickList({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className="bg-leaf-tint text-leaf-ink mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-base font-bold"
          >
            ✓
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}
