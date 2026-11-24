import type { NextRequest } from "next/server";
import { mandirCalendarEvents } from "@/lib/calendar-events";
import {
  calendarProblem,
  calendarResponse,
  notFound,
} from "@/lib/calendar-response";
import { getMandir } from "@/lib/directory";
import { cleanSlugs } from "@/lib/follow";
import { calendarFile } from "@/lib/ical";

// GET /my/calendar.ics?m=a,b,c: the upcoming events of every mandir a
// family follows, as one calendar to subscribe to, from My Toran. Which
// mandirs is in the address, like What's on's "Only mandirs I follow":
// Toran keeps nothing about who subscribes.
export async function GET(request: NextRequest) {
  const slugs = cleanSlugs(request.nextUrl.searchParams.get("m"));
  if (!slugs.length) return notFound();
  const results = await Promise.all(slugs.map((slug) => getMandir(slug)));
  // Only when none of them could be read: otherwise the ones that could.
  const failed = results.flatMap((r) => (r.state === "ok" ? [] : [r.state]));
  if (failed.length === results.length) return calendarProblem(failed[0]);
  const events = results.flatMap((r) =>
    r.state === "ok" && r.data
      ? mandirCalendarEvents(r.data, request.nextUrl.origin)
      : [],
  );
  return calendarResponse(calendarFile("My mandirs · Toran", events));
}
