"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The four main places in the header, from tablet size up (on a phone
// they're in the bar along the bottom, components/tab-bar.tsx). The page
// you're on is marked (for screen readers too) with a soft pill.
export function SiteNav({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="hidden md:block">
      <ul className="flex flex-wrap gap-1 text-lg whitespace-nowrap">
        {links.map(({ href, label }) => {
          const here = path === href || path.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={here ? "page" : undefined}
                className={`text-ink hover:bg-sunk block rounded-full px-4 py-2 text-center no-underline transition-colors ${here ? "bg-sunk font-semibold" : "font-medium"}`}
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
