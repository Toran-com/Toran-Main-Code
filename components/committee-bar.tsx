import Link from "next/link";

// A mandir's three pages for its committee: its events (the dashboard),
// its seva rotas and its numbers. Three equal parts that always fit on a
// phone, with the one you're on filled in. Everything else (sharing, the
// committee, the photo, the details, the calendar) is on the dashboard
// under "Your mandir".
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
  return (
    <nav aria-label="Your mandir on Toran">
      <ul className="bg-sunk grid grid-cols-3 gap-1 rounded-full p-1">
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
      </ul>
    </nav>
  );
}
