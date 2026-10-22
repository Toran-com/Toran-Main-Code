"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The main menu. The page you're on is marked (for screen readers too)
// with a soft pill. On a phone it fills its own row, spread across it.
export function SiteNav({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  const path = usePathname();
  return (
    <nav
      aria-label="Main"
      className="order-last w-full sm:order-none sm:w-auto"
    >
      <ul className="flex justify-between gap-0 overflow-x-auto text-base whitespace-nowrap sm:justify-start sm:gap-1.5 sm:overflow-visible sm:text-lg">
        {links.map(({ href, label }) => {
          const here = path === href || path.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={here ? "page" : undefined}
                className={`text-ink hover:bg-sunk block rounded-full px-1.5 py-2 text-center no-underline transition-colors sm:px-4 ${here ? "bg-sunk font-semibold" : "font-medium"}`}
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
