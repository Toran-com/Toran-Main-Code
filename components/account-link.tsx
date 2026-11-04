"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { menuRowClass } from "@/components/site-menu";

// The way back in for mandir committees, in the menu: "Committee log in"
// to a visitor, "Your account" once logged in. The login session's cookie
// (sb-…-auth-token) says which; until the page has loaded in the browser
// it's "Committee log in".
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
  return (
    <Link href={known ? "/account" : "/login"} className={menuRowClass}>
      {known ? account : logIn}
      <span aria-hidden="true" className="text-peacock">
        →
      </span>
    </Link>
  );
}
