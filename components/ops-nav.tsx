import Link from "next/link";

const LINKS = [
  { href: "/ops", label: "Overview" },
  { href: "/ops/today", label: "Today" },
  { href: "/ops/attention", label: "Needs attention" },
  { href: "/ops/mandirs", label: "Mandirs" },
  { href: "/ops/posters", label: "Review" },
  { href: "/ops/duplicates", label: "Duplicates" },
  { href: "/ops/websites", label: "Websites" },
  { href: "/ops/festivals", label: "Festival dates" },
  { href: "/ops/stats", label: "Stats" },
  { href: "/ops/digest", label: "Digest" },
  { href: "/ops/translations", label: "Translations" },
] as const;

// The admin area's own menu.
export function OpsNav({
  current,
}: {
  current: (typeof LINKS)[number]["href"];
}) {
  return (
    <nav aria-label="Admin">
      <ul className="flex flex-wrap gap-2">
        {LINKS.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={href === current ? "page" : undefined}
              className={`inline-block rounded-full border px-4 py-1.5 text-base font-semibold ${
                href === current
                  ? "border-peacock bg-peacock text-on-peacock"
                  : "border-line hover:bg-sunk"
              }`}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
