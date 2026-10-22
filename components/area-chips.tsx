import Link from "next/link";
import { regionKey } from "@/lib/i18n/client/mandirs";
import { pageT } from "@/lib/i18n/page";

// "Choose your area": a chip per region with how many there are, plus
// "All areas". One scrolling row on a phone, wrapping on wider screens.
export function AreaChips({
  areas,
  total,
  chosen,
  href,
}: {
  areas: { region: string; count: number }[];
  total: number;
  chosen: string;
  href: (region: string) => string;
}) {
  const t = pageT();
  if (areas.length < 2) return null;
  return (
    <nav
      aria-label={t("whatsOn.chooseArea")}
      className="-mx-4 flex flex-col gap-2 px-4 sm:mx-0 sm:px-0"
    >
      <p className="font-semibold">{t("whatsOn.chooseArea")}</p>
      <ul className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
        {[{ region: "", count: total }, ...areas].map((a) => {
          const here = a.region === chosen;
          return (
            <li key={a.region || "all"} className="shrink-0">
              <Link
                href={href(a.region)}
                aria-current={here ? "page" : undefined}
                className={`inline-block rounded-full border px-4 py-2 text-base whitespace-nowrap no-underline transition-colors ${
                  here
                    ? "border-ink bg-ink text-bg font-semibold"
                    : "border-line-strong bg-surface text-ink hover:border-peacock/60 font-medium"
                }`}
              >
                {a.region ? regionName(a.region) : t("whatsOn.allAreas")}{" "}
                <span className={here ? "" : "text-muted"}>{a.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// A region's name in the page's language, or as stored if it's not one
// Toran knows.
export function regionName(region: string): string {
  const key = regionKey(region);
  return key ? pageT()(key) : region;
}
