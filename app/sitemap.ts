import type { MetadataRoute } from "next";
import {
  getMandir,
  listFestivalDates,
  listFestivals,
  listMandirs,
} from "@/lib/directory";
import { seasonDays, seasonEvents, seasonWindow } from "@/lib/festival-season";
import { LOCALES } from "@/lib/i18n";
import { hasGujarati, withLocale } from "@/lib/i18n/paths";
import { SEASONS } from "@/lib/seasons";
import { eventPath } from "@/lib/share";
import { site, siteUrl } from "@/lib/site";
import { townCounts } from "@/lib/towns";
import { listUpcomingEvents } from "@/lib/whats-on";

// Every public page, for search engines. Empty until launch, so nothing is
// listed before the pages are ready.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!site.launched) return [];
  const base = siteUrl();
  const [mandirs, festivals, dates, upcoming] = await Promise.all([
    listMandirs(),
    listFestivals(),
    listFestivalDates(),
    listUpcomingEvents(),
  ]);
  // Each season's town pages, for the towns with something on (the rest
  // aren't offered to search engines: see components/season-town-page.tsx).
  const townPages =
    dates.state === "ok" && upcoming.state === "ok"
      ? SEASONS.flatMap((season) => {
          const window = seasonWindow(seasonDays(dates.data, season));
          if (!window) return [];
          return townCounts(seasonEvents(upcoming.data, season, window)).map(
            (town) => ({
              url: `${base}/${season.slug}/${town.slug}`,
              changeFrequency: "daily" as const,
            }),
          );
        })
      : [];
  const mandirList = mandirs.state === "ok" ? mandirs.data : [];
  const events = (
    await Promise.all(
      mandirList.map(async ({ slug }) => {
        const result = await getMandir(slug);
        return result.state === "ok" && result.data
          ? result.data.events.map((e) => ({
              url: `${base}${eventPath(slug, e.id)}`,
              changeFrequency: "weekly" as const,
            }))
          : [];
      }),
    )
  ).flat();
  const english: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/whats-on`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/seva`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/for-mandirs`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/for-mandirs/guide`, changeFrequency: "monthly" },
    ...["/about", "/contact", "/privacy", "/terms", "/accessibility"].map(
      (path) => ({
        url: `${base}${path}`,
        changeFrequency: "monthly" as const,
      }),
    ),
    { url: `${base}/mandirs`, changeFrequency: "weekly" },
    { url: `${base}/festivals`, changeFrequency: "weekly" },
    ...SEASONS.map((s) => ({
      url: `${base}/${s.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...townPages,
    ...mandirList.map((m) => ({
      url: `${base}/mandirs/${m.slug}`,
      changeFrequency: "daily" as const,
    })),
    ...(festivals.state === "ok" ? festivals.data : []).map((f) => ({
      url: `${base}/festivals/${f.slug}`,
      changeFrequency: "weekly" as const,
    })),
    ...events,
  ];
  if (!LOCALES.gu.ready) return english;
  // Once the Gujarati has been checked, its pages too.
  const gujarati = english.flatMap((entry) => {
    const path = entry.url.slice(base.length) || "/";
    return hasGujarati(path)
      ? [{ ...entry, url: `${base}${withLocale(path, "gu")}` }]
      : [];
  });
  return [...english, ...gujarati];
}
