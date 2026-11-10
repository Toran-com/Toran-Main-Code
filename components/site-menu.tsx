"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";

// "Menu", with its name beside the three lines so everyone knows what it
// is. It opens a panel over the page (all of a phone's screen, or the
// right-hand side of a laptop's) with every page, text size, language and
// the way in for committees, so the header itself stays to a few buttons.
// A <details>, so it opens without waiting for the page's JavaScript; it
// closes on Escape, on the close button, outside the panel, or when you
// go to another page.
export function SiteMenu({
  label,
  close,
  children,
}: {
  label: string;
  close: string;
  children: ReactNode;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const path = usePathname();

  const shut = () => {
    if (!menu.current?.open) return;
    menu.current.open = false;
    menu.current.querySelector("summary")?.focus();
  };

  // A new page closes it.
  useEffect(() => {
    if (menu.current) menu.current.open = false;
  }, [path]);

  // Escape closes it. (While it's open, app/globals.css keeps the page
  // behind it still.)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") shut();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <details ref={menu} className="site-menu">
      <summary className="text-on-night hover:bg-on-night/10 inline-flex h-[44px] cursor-pointer list-none items-center gap-[8px] rounded-full px-[12px] text-[18px] font-semibold whitespace-nowrap transition-colors [&::-webkit-details-marker]:hidden">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-[24px] shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        {label}
      </summary>
      <div className="fixed inset-0 z-50">
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={shut}
          className="menu-backdrop absolute inset-0 cursor-default bg-black/45"
        />
        <div
          role="group"
          aria-label={label}
          className="menu-panel bg-bg shadow-lift absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto overscroll-contain"
        >
          <div className="bg-bg border-line sticky top-0 z-10 flex items-center justify-between gap-4 border-b px-5 py-3">
            <p className="font-display text-3xl">{label}</p>
            <button
              type="button"
              onClick={shut}
              className="text-ink hover:bg-sunk inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-3 font-semibold"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
              {close}
            </button>
          </div>
          <div className="flex flex-col gap-8 px-3 pt-4 pb-10">{children}</div>
        </div>
      </div>
    </details>
  );
}

// A heading and its rows, inside the menu.
export function MenuSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="text-muted px-3 pb-1 text-base font-semibold">
        {heading}
      </h2>
      {children}
    </section>
  );
}

// One big row in the menu: easy to read and to tap.
export const menuRowClass =
  "text-ink hover:bg-sunk flex items-center justify-between gap-3 rounded-2xl px-3 py-3 text-xl font-semibold no-underline transition-colors";
