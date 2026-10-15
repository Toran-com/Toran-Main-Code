import type { Loaded } from "@/lib/directory";

// Plain answers for the calendar addresses: calendar apps show the status,
// people opening the link see the words.
export function calendarProblem(
  state: Exclude<Loaded<unknown>["state"], "ok">,
) {
  return new Response(
    state === "not connected"
      ? "Calendars aren't available yet."
      : "This calendar couldn't be loaded just now. Please try again soon.",
    { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}

export function notFound() {
  return new Response("There's no calendar at this address.", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

// A calendar file. Downloads (one event) are saved as a file; subscriptions
// are read by the calendar app. Not listed by search engines.
export function calendarResponse(body: string, download?: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=900",
      "X-Robots-Tag": "noindex",
      ...(download && {
        "Content-Disposition": `attachment; filename="${download}.ics"`,
      }),
    },
  });
}
