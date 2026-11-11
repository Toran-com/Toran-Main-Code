import Link from "next/link";
import { pillButtonClass, pillPrimaryClass } from "@/components/ui";

// A mandir's own bar for its committee: its Seva and Numbers pages and
// each part of its dashboard, one tap away from any of them (the way back
// to the dashboard itself is the "← mandir" link above the page). It stays under the header as you scroll, and on a phone it's a row
// to swipe. The page you're on is filled in.
export function CommitteeBar({
  slug,
  current,
}: {
  slug: string;
  current: "home" | "seva" | "numbers";
}) {
  const home = `/manage/${slug}`;
  // On the dashboard its parts are on the same page.
  const part = (hash: string) => (current === "home" ? hash : `${home}${hash}`);
  const links: { href: string; label: string; here?: boolean }[] = [
    { href: `${home}/seva`, label: "Seva", here: current === "seva" },
    { href: `${home}/numbers`, label: "Numbers", here: current === "numbers" },
    { href: part("#share"), label: "Share" },
    { href: part("#committee"), label: "Committee" },
    { href: part("#photo"), label: "Photo" },
    { href: part("#details"), label: "Details" },
    { href: part("#calendar"), label: "Your calendar" },
  ];
  return (
    <nav
      aria-label="More for your mandir"
      className="sticks border-line bg-bg/90 -mx-4 border-b px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:rounded-b-2xl"
    >
      <ul className="flex [scrollbar-width:none] gap-2 overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden">
        {links.map(({ href, label, here }) => (
          <li key={label} className="shrink-0">
            <Link
              href={href}
              aria-current={here ? "page" : undefined}
              className={here ? pillPrimaryClass : pillButtonClass}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
