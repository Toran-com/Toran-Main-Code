import type { NextRequest } from "next/server";
import { seasonCalendar } from "@/lib/season-calendar";
import { RAM_NAVAMI } from "@/lib/seasons";

// Every mandir's Ram Navami events as a calendar to subscribe to.
export function GET(request: NextRequest) {
  return seasonCalendar(RAM_NAVAMI, request.nextUrl.origin);
}
