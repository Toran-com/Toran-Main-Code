"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

// The way back in for mandir committees, beside My Toran and Aa: "Log in"
// to a visitor, "Your account" once logged in. The login session's cookie
// (sb-…-auth-token) says which; until the page has loaded in the browser
// it's "Log in".
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
      className={`text-ink hover:bg-sunk inline-flex size-11 items-center justify-center rounded-full no-underline transition-colors ${here ? "bg-sunk" : ""}`}
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
