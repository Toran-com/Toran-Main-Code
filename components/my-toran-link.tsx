"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// My Toran in the header, from tablet size up: a star in a bookmark, with
// its name. On a phone it's in the bar along the bottom instead.
export function MyToranLink({ label, href }: { label: string; href: string }) {
  const here = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={here ? "page" : undefined}
      className={`text-ink hover:bg-sunk hidden h-11 items-center justify-center gap-2 rounded-full px-4 no-underline transition-colors md:inline-flex ${here ? "bg-sunk" : ""}`}
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
      <span className="text-lg font-semibold">{label}</span>
    </Link>
  );
}
