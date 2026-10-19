import { cacheLife, cacheTag } from "next/cache";
import { listFestivalDates } from "@/lib/directory";
import { bannerSeason } from "@/lib/festival-season";

// Which festival season the home page points to, if any, and its main
// festival's dates. Worked out from today's date, so cached for hours
// rather than fixed when the site is built.
export async function getSeasonBanner(): Promise<{
  slug: string;
  name: string;
  starts_on: string;
  ends_on: string;
} | null> {
  "use cache";
  cacheTag("festivals");
  cacheLife("hours");
  const result = await listFestivalDates();
  if (result.state !== "ok") return null;
  const found = bannerSeason(result.data);
  if (!found) return null;
  const main = found.days.find((d) => d.slug === found.season.main)!;
  return {
    slug: found.season.slug,
    name: found.season.name,
    starts_on: main.starts_on,
    ends_on: main.ends_on,
  };
}
