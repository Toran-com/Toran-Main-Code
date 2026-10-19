import type { NextRequest } from "next/server";
import { seasonCalendar } from "@/lib/season-calendar";
import { NAVRATRI } from "@/lib/seasons";

// Every mandir's Navratri events as a calendar to subscribe to.
export function GET(request: NextRequest) {
  return seasonCalendar(NAVRATRI, request.nextUrl.origin);
}
