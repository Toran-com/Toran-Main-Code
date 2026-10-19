import type { NextRequest } from "next/server";
import { seasonCalendar } from "@/lib/season-calendar";
import { MAHA_SHIVARATRI } from "@/lib/seasons";

// Every mandir's Maha Shivaratri events as a calendar to subscribe to.
export function GET(request: NextRequest) {
  return seasonCalendar(MAHA_SHIVARATRI, request.nextUrl.origin);
}
