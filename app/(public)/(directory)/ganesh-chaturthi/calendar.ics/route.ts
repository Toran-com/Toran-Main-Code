import type { NextRequest } from "next/server";
import { seasonCalendar } from "@/lib/season-calendar";
import { GANESH_CHATURTHI } from "@/lib/seasons";

// Every mandir's Ganesh Chaturthi events as a calendar to subscribe to.
export function GET(request: NextRequest) {
  return seasonCalendar(GANESH_CHATURTHI, request.nextUrl.origin);
}
