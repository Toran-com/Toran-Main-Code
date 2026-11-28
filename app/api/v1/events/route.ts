import type { NextRequest } from "next/server";
import { listApiEvents, MAX_BATCH, putApiEvent } from "@/lib/events-api";
import { siteUrl } from "@/lib/site";
import { bodyOf, json, refresh, withKey } from "./respond";

// GET /api/v1/events: the events this mandir's system has put on Toran.
// POST /api/v1/events: puts up to 100 at once, { "events": [{ "id": …,
// …the event }] }, each created or changed by its id; each result has
// the HTTP status it would have had on its own (http_status). Documented at
// /for-mandirs/events-api (decision 0032).
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return withKey(request, async (db, mandir) =>
    json({
      mandir: { slug: mandir.slug, name: mandir.name },
      events: await listApiEvents(db, mandir, siteUrl()),
    }),
  );
}

export async function POST(request: NextRequest) {
  return withKey(request, async (db, mandir) => {
    const body = await bodyOf(request);
    const events =
      body && typeof body === "object" && "events" in body
        ? (body as { events: unknown }).events
        : undefined;
    if (!Array.isArray(events) || !events.length) {
      return json(
        { error: 'Send { "events": [ … ] } with at least one event.' },
        400,
      );
    }
    if (events.length > MAX_BATCH) {
      return json(
        { error: `Send at most ${MAX_BATCH} events at a time.` },
        400,
      );
    }
    const site = siteUrl();
    const results = [];
    for (const event of events) {
      const id =
        event && typeof event === "object" && typeof event.id === "string"
          ? event.id
          : "";
      const result = await putApiEvent(db, mandir, id, event, {
        siteUrl: site,
      });
      results.push({ ...result.body, id, http_status: result.status });
    }
    if (results.some((r) => r.http_status < 300)) refresh(mandir);
    const failed = results.filter((r) => r.http_status >= 300).length;
    return json(
      { results, saved: results.length - failed, failed },
      failed ? 207 : 200,
    );
  });
}
