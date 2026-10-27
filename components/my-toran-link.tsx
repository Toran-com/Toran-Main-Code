"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// My Toran in the header, beside Search and Aa: a star in a bookmark, with
// its name beside it where there's room. The main menu's row has no room
// for a fifth word on a phone.
export function MyToranLink({ label, href }: { label: string; href: string }) {
  const here = usePathname() === href;
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      aria-current={here ? "page" : undefined}
      className={`text-ink hover:bg-sunk inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full no-underline transition-colors sm:px-4 ${here ? "bg-sunk" : ""}`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-6 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      >
        <path d="M6 3.5h12v17l-6-4-6 4z" />
        <path d="m12 7 1.2 2.5 2.7.4-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.4z" />
      </svg>
      <span
        aria-hidden="true"
        className="hidden text-lg font-semibold sm:inline"
      >
        {label}
      </span>
    </Link>
  );
}
