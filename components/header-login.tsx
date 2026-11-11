"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

// "Log in" in the header, gold so it's easy to find: it opens the way in
// for families and for mandir committees (/login). Once logged in it's a
// person in a circle, for "Your account". The login session's cookie
// (sb-…-auth-token) says which; until the page has loaded in the browser
// it's "Log in". On the narrowest phones "Log in" is the person too, so
// the header still fits.
const noSubscribe = () => () => {};
const loggedIn = () => /(^|;\s*)sb-[^=]+-auth-token/.test(document.cookie);

const PERSON = (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="size-[22px] shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 19.5c1.2-3.3 4-5 7-5s5.8 1.7 7 5" />
  </svg>
);

export function HeaderLogin({
  logIn,
  account,
}: {
  logIn: string;
  account: string;
}) {
  const known = useSyncExternalStore(noSubscribe, loggedIn, () => false);
  if (known)
    return (
      <Link
        href="/account"
        aria-label={account}
        title={account}
        className="border-night-accent/70 text-night-accent hover:bg-on-night/10 inline-flex h-[44px] min-w-[44px] items-center justify-center gap-[8px] rounded-full border-2 px-[10px] text-[18px] font-semibold no-underline transition-colors"
      >
        {PERSON}
        <span className="hidden whitespace-nowrap lg:inline">{account}</span>
      </Link>
    );
  return (
    <Link
      href="/login"
      title={logIn}
      className="bg-night-accent text-night inline-flex h-[40px] min-w-[40px] items-center justify-center gap-[6px] rounded-full px-[14px] text-[18px] font-bold whitespace-nowrap no-underline shadow-[0_6px_18px_rgba(0,0,0,0.25)] transition hover:brightness-105 active:scale-[0.97] max-[359px]:px-[9px]"
    >
      <span className="hidden max-[359px]:inline-flex">{PERSON}</span>
      <span className="max-[359px]:sr-only">{logIn}</span>
    </Link>
  );
}
