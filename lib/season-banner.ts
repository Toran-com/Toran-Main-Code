import { cacheLife, cacheTag } from "next/cache";
import { listFestivalDates } from "@/lib/directory";
import { DIWALI, seasonDays, showSeasonBanner } from "@/lib/festival-season";

// Whether the home page points to Diwali week, and Diwali's date. Worked
// out from today's date, so cached for hours rather than fixed when the
// site is built.
export async function getSeasonBanner(): Promise<{
  starts_on: string;
  ends_on: string;
} | null> {
  "use cache";
  cacheTag("festivals");
  cacheLife("hours");
  const result = await listFestivalDates();
  if (result.state !== "ok") return null;
  const days = seasonDays(result.data, DIWALI);
  if (!showSeasonBanner(days, DIWALI)) return null;
  const main = days.find((d) => d.slug === DIWALI.main);
  return main ? { starts_on: main.starts_on, ends_on: main.ends_on } : null;
}
