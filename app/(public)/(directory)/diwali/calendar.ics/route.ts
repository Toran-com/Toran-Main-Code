import type { NextRequest } from "next/server";
import { seasonCalendar } from "@/lib/season-calendar";
import { DIWALI } from "@/lib/seasons";

// Every mandir's Diwali events as a calendar to subscribe to.
export function GET(request: NextRequest) {
  return seasonCalendar(DIWALI, request.nextUrl.origin);
}
