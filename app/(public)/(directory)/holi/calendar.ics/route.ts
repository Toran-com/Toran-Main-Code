import type { NextRequest } from "next/server";
import { seasonCalendar } from "@/lib/season-calendar";
import { HOLI } from "@/lib/seasons";

// Every mandir's Holi events as a calendar to subscribe to.
export function GET(request: NextRequest) {
  return seasonCalendar(HOLI, request.nextUrl.origin);
}
