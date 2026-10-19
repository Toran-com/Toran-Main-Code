import type { MetadataRoute } from "next";
import { getMandir, listFestivals, listMandirs } from "@/lib/directory";
import { LOCALES } from "@/lib/i18n";
import { hasGujarati, withLocale } from "@/lib/i18n/paths";
import { eventPath } from "@/lib/share";
import { site, siteUrl } from "@/lib/site";

// Every public page, for search engines. Empty until launch, so nothing is
// listed before the pages are ready.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!site.launched) return [];
  const base = siteUrl();
  const [mandirs, festivals] = await Promise.all([
    listMandirs(),
    listFestivals(),
  ]);
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
    { url: `${base}/for-mandirs`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/for-mandirs/guide`, changeFrequency: "monthly" },
    { url: `${base}/mandirs`, changeFrequency: "weekly" },
    { url: `${base}/festivals`, changeFrequency: "weekly" },
    { url: `${base}/diwali`, changeFrequency: "daily", priority: 0.8 },
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
