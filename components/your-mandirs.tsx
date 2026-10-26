"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  keepOffline,
  Star,
  useFollowing,
  whatsOnHref,
} from "@/components/follow";
import { useLocale, useT } from "@/components/use-t";
import { enFollow } from "@/lib/i18n/client/follow";

// "Your mandirs" on the home page: the mandirs this phone follows, each
// with its next event. Which ones are followed never leaves the phone, so
// the page brings every mandir's name and next event, and the browser
// shows the followed ones. Nothing shows until something is followed.

export type MandirBrief = {
  name: string;
  path: string;
  next: { title: string; when: string; path: string } | null;
};

export function YourMandirs({
  mandirs,
}: {
  mandirs: Record<string, MandirBrief>;
}) {
  const t = useT(enFollow);
  const locale = useLocale();
  const following = useFollowing().filter((slug) => slug in mandirs);

  // Keep their pages fresh for offline use (at most twice a day).
  const key = following.join(",");
  useEffect(() => {
    if (key) keepOffline(locale);
  }, [key, locale]);

  if (!following.length) return null;
  return (
    <section aria-labelledby="your-mandirs" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2
          id="your-mandirs"
          className="font-display flex items-center gap-3 text-4xl leading-tight tracking-tight sm:text-5xl"
        >
          <span className="text-peacock">
            <Star filled />
          </span>
          {t("follow.yours")}
        </h2>
        <Link
          href={whatsOnHref(locale, "", following)}
          className="text-peacock text-lg font-semibold"
        >
          {t("follow.allEvents")} →
        </Link>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {following.map((slug) => {
          const m = mandirs[slug];
          return (
            <li
              key={slug}
              className="border-line bg-surface shadow-card flex flex-col gap-1 rounded-2xl border p-4"
            >
              <Link
                href={m.path}
                className="text-ink text-lg font-semibold no-underline hover:underline"
              >
                {m.name}
              </Link>
              {m.next ? (
                <p>
                  <span className="text-marigold-ink block font-semibold">
                    {m.next.when}
                  </span>
                  <Link href={m.next.path} className="text-peacock underline">
                    {m.next.title}
                  </Link>
                </p>
              ) : (
                <p className="text-muted">{t("follow.nothing")}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
