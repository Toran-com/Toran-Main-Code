import Link from "next/link";
import { GUIDE_PATH } from "@/lib/committee-guide";

// A mandir's three pages for its committee: its events (the dashboard),
// its seva rotas and its numbers. Three equal parts that always fit on a
// phone, with the one you're on filled in. Everything else (sharing, the
// committee, the photo, the details, the calendar) is on the dashboard
// under "Your mandir". At the end, a "?" opens the committee guide at the
// part about this page, in a new tab, so it's there beside the work.
export function CommitteeBar({
  slug,
  current,
}: {
  slug: string;
  current: "home" | "seva" | "numbers";
}) {
  const home = `/manage/${slug}`;
  const links = [
    { href: home, label: "Events", here: current === "home" },
    { href: `${home}/seva`, label: "Seva", here: current === "seva" },
    { href: `${home}/numbers`, label: "Numbers", here: current === "numbers" },
  ];
  const part = { home: "hub", seva: "seva", numbers: "numbers" }[current];
  return (
    <nav aria-label="Your mandir on Toran">
      <ul className="bg-sunk grid grid-cols-[1fr_1fr_1fr_auto] gap-1 rounded-full p-1">
        {links.map(({ href, label, here }) => (
          <li key={label}>
            <Link
              href={href}
              aria-current={here ? "page" : undefined}
              className={`flex justify-center rounded-full px-3 py-2 text-base font-semibold no-underline transition ${
                here
                  ? "bg-surface text-ink shadow-card"
                  : "text-muted hover:text-ink"
              }`}
            >
              {label}
            </Link>
          </li>
        ))}
        <li>
          <a
            href={`${GUIDE_PATH}#${part}`}
            target="_blank"
            rel="noopener"
            aria-label="Committee guide (opens in a new tab)"
            title="Committee guide"
            className="text-muted hover:text-ink hover:bg-surface grid size-10 place-items-center rounded-full font-bold no-underline transition"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" />
            </svg>
          </a>
        </li>
      </ul>
    </nav>
  );
}
