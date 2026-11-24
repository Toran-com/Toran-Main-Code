"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// My Toran in the header, on a sideways tablet and up (1024px): a star in
// a bookmark, with its name from 1180px, a sideways iPad Air (just the
// star until then, so the header row fits). On a phone and an upright
// tablet it's in the bar along the bottom instead.
export function MyToranLink({ label, href }: { label: string; href: string }) {
  const here = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={here ? "page" : undefined}
      aria-label={label}
      title={label}
      className={`text-on-night hover:bg-on-night/10 hidden h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full px-2.5 whitespace-nowrap no-underline transition-colors min-[1180px]:px-4 lg:inline-flex ${here ? "bg-on-night/15" : ""}`}
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
        className="hidden text-lg font-semibold min-[1180px]:inline"
      >
        {label}
      </span>
    </Link>
  );
}
