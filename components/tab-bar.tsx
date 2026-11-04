"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type TabIcon = "events" | "mandirs" | "festivals" | "my";

// On a phone, the main places sit along the bottom of the screen, where a
// thumb reaches, each with a picture and its name, as in most phone apps.
// The labels stay at 18px whatever the text size, so four always fit
// side by side; everything else on the page grows with "Text size".
export function TabBar({
  tabs,
}: {
  tabs: { href: string; label: string; icon: TabIcon }[];
}) {
  const path = usePathname();
  return (
    <nav
      aria-label="Main"
      className="tab-bar border-line bg-surface fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.06)] md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {tabs.map(({ href, label, icon }) => {
          const here = path === href || path.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={here ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 px-1 pt-2 pb-2.5 text-center text-[18px] leading-tight no-underline transition-colors ${
                  here
                    ? "text-peacock font-semibold"
                    : "text-muted hover:text-ink font-medium"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${
                    here ? "bg-peacock/12" : ""
                  }`}
                >
                  {ICONS[icon]}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const svg = (paths: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    className="size-6"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {paths}
  </svg>
);

const ICONS: Record<TabIcon, ReactNode> = {
  // A calendar page.
  events: svg(
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>,
  ),
  // A mandir: a shikhara over a doorway.
  mandirs: svg(
    <>
      <path d="M12 2.5v2M12 4.5 7.5 11h9z" />
      <path d="M5 11h14v9.5H5zM10 20.5v-4.5a2 2 0 0 1 4 0v4.5" />
    </>,
  ),
  // A diya.
  festivals: svg(
    <>
      <path d="M12 3.5c1.8 2.2 2.4 3.6 2.4 4.7a2.4 2.4 0 0 1-4.8 0c0-1.1.6-2.5 2.4-4.7z" />
      <path d="M3.5 13h17c-.7 4-4.2 6.5-8.5 6.5S4.2 17 3.5 13z" />
    </>,
  ),
  // My Toran's star in a bookmark, as in the header.
  my: svg(
    <>
      <path d="M6 3.5h12v17l-6-4-6 4z" />
      <path d="m12 7 1.2 2.5 2.7.4-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.4z" />
    </>,
  ),
};
