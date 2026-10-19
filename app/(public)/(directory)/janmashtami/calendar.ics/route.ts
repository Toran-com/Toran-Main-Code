import type { NextRequest } from "next/server";
import { seasonCalendar } from "@/lib/season-calendar";
import { JANMASHTAMI } from "@/lib/seasons";

// Every mandir's Janmashtami events as a calendar to subscribe to.
export function GET(request: NextRequest) {
  return seasonCalendar(JANMASHTAMI, request.nextUrl.origin);
}
