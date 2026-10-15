import type { MetadataRoute } from "next";
import { getMandir, listFestivals, listMandirs } from "@/lib/directory";
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
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/whats-on`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/for-mandirs`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/mandirs`, changeFrequency: "weekly" },
    { url: `${base}/festivals`, changeFrequency: "weekly" },
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
}
