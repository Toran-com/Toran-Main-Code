"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The four main places in the header, on a sideways tablet and up (from
// 1024px; the header row needs about 950px). On a phone and an upright
// tablet they're in the bar along the bottom, components/tab-bar.tsx. The
// page you're on is marked (for screen readers too) with a soft pill.
export function SiteNav({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="hidden lg:block">
      <ul className="flex gap-1 text-lg whitespace-nowrap">
        {links.map(({ href, label }) => {
          const here = path === href || path.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={here ? "page" : undefined}
                className={`text-on-night hover:bg-on-night/10 block rounded-full px-4 py-2 text-center no-underline transition-colors ${here ? "bg-on-night/15 font-semibold" : "font-medium"}`}
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
