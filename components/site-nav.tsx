"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The main menu. The page you're on is marked (for screen readers too)
// with a soft pill. On a phone it fills its own row.
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
      <ul className="grid grid-cols-3 gap-1 text-base whitespace-nowrap sm:flex sm:gap-1.5 sm:text-lg">
        {links.map(({ href, label }) => {
          const here = path === href || path.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={here ? "page" : undefined}
                className={`text-ink hover:bg-sunk block rounded-full px-3 py-2 text-center no-underline transition-colors sm:px-4 ${here ? "bg-sunk font-semibold" : "font-medium"}`}
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
