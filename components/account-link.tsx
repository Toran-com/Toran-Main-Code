"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

// The way back in for mandir committees, beside My Toran and Aa: "Log in"
// to a visitor, "Your account" once logged in. The login session's cookie
// (sb-…-auth-token) says which; until the page has loaded in the browser
// it's "Log in". On a phone it's an icon; from laptop size up it's the
// committees button instead (CommitteeLink), so the header stays calm.
const noSubscribe = () => () => {};
const loggedIn = () => /(^|;\s*)sb-[^=]+-auth-token/.test(document.cookie);

export function AccountLink({
  logIn,
  account,
}: {
  logIn: string;
  account: string;
}) {
  const known = useSyncExternalStore(noSubscribe, loggedIn, () => false);
  const path = usePathname();
  const href = known ? "/account" : "/login";
  const label = known ? account : logIn;
  const here = path === "/account" || path === "/login" || path === "/join";
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      aria-current={here ? "page" : undefined}
      className={`text-ink hover:bg-sunk inline-flex size-11 items-center justify-center rounded-full no-underline transition-colors lg:hidden ${here ? "bg-sunk" : ""}`}
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
        <circle cx="12" cy="8" r="3.75" />
        <path d="M4.5 20c.9-3.6 3.9-5.5 7.5-5.5s6.6 1.9 7.5 5.5" />
      </svg>
    </Link>
  );
}

// From laptop size up: one button for committees. "For mandir committees"
// (which has logging in and creating an account) to a visitor, "Your
// account" once logged in.
export function CommitteeLink({
  forMandirs,
  account,
}: {
  forMandirs: string;
  account: string;
}) {
  const known = useSyncExternalStore(noSubscribe, loggedIn, () => false);
  const path = usePathname();
  const href = known ? "/account" : "/for-mandirs";
  return (
    <Link
      href={href}
      aria-current={path === href ? "page" : undefined}
      className={`hover:border-peacock/60 text-ink hidden rounded-full border px-5 py-2 text-base font-semibold whitespace-nowrap no-underline lg:inline-flex ${path === href ? "border-ink" : "border-line-strong"}`}
    >
      {known ? account : forMandirs}
    </Link>
  );
}
