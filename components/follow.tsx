"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { actionPillClass } from "@/components/ui";
import { useLocale, useT } from "@/components/use-t";
import {
  followingSnapshot,
  onFollowingChange,
  parseFollowing,
  setFollowing,
} from "@/lib/follow";
import { enFollow } from "@/lib/i18n/client/follow";

// Following mandirs on this phone (lib/follow.ts): a button on a mandir's
// page, and on What's on a way to show only the mandirs followed.

export function useFollowing(): string[] {
  const snapshot = useSyncExternalStore(
    onFollowingChange,
    followingSnapshot,
    // Drawn as "not following" first, then as saved on the phone.
    () => "",
  );
  return useMemo(() => parseFollowing(snapshot), [snapshot]);
}

export function whatsOnHref(
  locale: string,
  base: string,
  slugs: string[],
): string {
  const page = base || (locale === "gu" ? "/gu/whats-on" : "/whats-on");
  const [path, query = ""] = page.split("?");
  const params = new URLSearchParams(query);
  params.set("mandirs", slugs.join(","));
  return `${path}?${params.toString().replace(/%2C/g, ",")}`;
}

export function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
    </svg>
  );
}

// Asks the service worker (public/sw.js) to keep the followed mandirs'
// pages for offline use, and to forget ones no longer followed. Just the
// addresses go to the phone's own service worker; nothing reaches Toran.
export function keepOffline(locale: string) {
  const worker =
    typeof navigator === "undefined"
      ? null
      : navigator.serviceWorker?.controller;
  if (!worker) return;
  const paths = parseFollowing(followingSnapshot()).map(
    (slug) => `${locale === "gu" ? "/gu" : ""}/mandirs/${slug}`,
  );
  worker.postMessage({ type: "followed", paths });
}

// "Follow" on a mandir's page; once followed, where to see its events.
export function FollowButton({ slug }: { slug: string }) {
  const t = useT(enFollow);
  const locale = useLocale();
  const following = useFollowing();
  const on = following.includes(slug);
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        aria-pressed={on}
        onClick={() => {
          setFollowing(slug, !on);
          keepOffline(locale);
        }}
        className={`${actionPillClass} self-start ${on ? "border-peacock" : ""}`}
      >
        <Star filled={on} />
        {on ? t("follow.following") : t("follow.follow")}
      </button>
      {on && (
        <p className="text-muted text-base" aria-live="polite">
          {t("follow.saved")}{" "}
          <Link
            href={whatsOnHref(locale, "", following)}
            className="text-peacock font-semibold underline"
          >
            {t("follow.see")}
          </Link>
        </p>
      )}
    </div>
  );
}

// On What's on: "Only mandirs I follow", when this phone follows any.
// "href" is What's on with the visitor's other choices.
export function FollowedOnly({ href }: { href: string }) {
  const t = useT(enFollow);
  const locale = useLocale();
  const following = useFollowing();
  if (!following.length) return null;
  return (
    <Link
      href={whatsOnHref(locale, href, following)}
      className={`${actionPillClass} self-start`}
    >
      <Star filled />
      {t("follow.only", { count: following.length })}
    </Link>
  );
}
