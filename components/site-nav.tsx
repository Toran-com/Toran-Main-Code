"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The main menu. The page you're on is marked (for screen readers too) and
// underlined in marigold.
export function SiteNav({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  const path = usePathname();
  return (
    <nav aria-label="Main">
      <ul className="flex gap-4 text-base font-semibold whitespace-nowrap sm:gap-6 sm:text-lg">
        {links.map(({ href, label }) => {
          const here = path === href || path.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={here ? "page" : undefined}
                className={`nav-link hover:text-peacock ${here ? "text-peacock" : ""}`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
