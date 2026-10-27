"use server";

import { cleanSlugs } from "@/lib/follow";
import { formatClock, formatEventStart, formatWeekday } from "@/lib/format";
import { eventsForHub, mandirsForHub } from "@/lib/hub-data";
import { localePath, setPageLocale } from "@/lib/i18n/page";
import { readSessions, type Session, WEEKDAYS } from "@/lib/opening-hours";
import { eventPath } from "@/lib/share";
import { listUpcomingEvents } from "@/lib/whats-on";

// My Toran asks for the names of what the phone keeps: the mandirs it
// follows and the events in its plan and past events. Only the ids come
// in; nothing is stored, and the answer is public directory information
// in the page's language.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_IDS = 250;

export type HubMandir = {
  name: string;
  town: string;
  path: string;
  hours: {
    sessions: Session[];
    times: Record<string, string>;
    days: Record<number, string>;
  } | null;
  next: { title: string; when: string; path: string } | null;
};

export type HubEvent = {
  title: string;
  mandir: string;
  town: string;
  slug: string;
  path: string;
  cancelled: boolean;
};

export type HubDetails =
  | {
      state: "ok";
      mandirs: Record<string, HubMandir>;
      events: Record<string, HubEvent>;
      // "Sat 31 Oct, 6pm" for each event and date asked about, by
      // "<id>@<date>".
      when: Record<string, string>;
    }
  | { state: "not connected" | "unavailable" };

// The events asked about, with the date the phone has for each.
function cleanEvents(value: unknown): { id: string; at: string }[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const events: { id: string; at: string }[] = [];
  for (const v of value) {
    if (!v || typeof v !== "object") continue;
    const id = String((v as { id: unknown }).id).toLowerCase();
    const at = String((v as { at: unknown }).at);
    if (!UUID.test(id) || Number.isNaN(Date.parse(at))) continue;
    if (seen.has(`${id}@${at}`)) continue;
    seen.add(`${id}@${at}`);
    events.push({ id, at });
    if (events.length >= MAX_IDS) break;
  }
  return events;
}

export async function loadHub(
  locale: string,
  slugValues: unknown,
  eventValues: unknown,
): Promise<HubDetails> {
  const gujarati = locale === "gu";
  setPageLocale(gujarati ? "gu" : "en");
  // Sorted, so the same phone asks the same cached question.
  const slugs = cleanSlugs(slugValues).sort();
  const asked = cleanEvents(eventValues);
  const ids = [...new Set(asked.map((e) => e.id))].sort();

  const [mandirs, events, upcoming] = await Promise.all([
    mandirsForHub(slugs),
    eventsForHub(ids),
    slugs.length
      ? listUpcomingEvents()
      : Promise.resolve({ state: "ok" as const, data: [] }),
  ]);
  if (mandirs.state !== "ok") return { state: mandirs.state };
  if (events.state !== "ok") return { state: events.state };

  // Each followed mandir's next event.
  const next = new Map<
    string,
    { id: string; title: string; at: string; allDay: boolean }
  >();
  if (upcoming.state === "ok") {
    for (const e of upcoming.data) {
      if (e.status !== "published" || !slugs.includes(e.mandir.slug)) continue;
      const soonest = next.get(e.mandir.slug);
      if (!soonest || e.next_starts_at < soonest.at) {
        next.set(e.mandir.slug, {
          id: e.id,
          title: (gujarati && e.title_gu) || e.title,
          at: e.next_starts_at,
          allDay: e.all_day,
        });
      }
    }
  }

  const mandirDetails: Record<string, HubMandir> = {};
  for (const m of mandirs.data) {
    const sessions = readSessions(m.opening_hours);
    const e = next.get(m.slug);
    mandirDetails[m.slug] = {
      name: m.name,
      town: m.town,
      path: localePath(`/mandirs/${m.slug}`),
      hours: sessions.length
        ? {
            sessions,
            times: Object.fromEntries(
              sessions
                .flatMap((s) => [s.opens, s.closes])
                .map((c) => [c, formatClock(c)]),
            ),
            days: Object.fromEntries(
              WEEKDAYS.map((d) => [d, formatWeekday(d, "long")]),
            ),
          }
        : null,
      next: e
        ? {
            title: e.title,
            when: formatEventStart(e.at, e.allDay),
            path: localePath(eventPath(m.slug, e.id)),
          }
        : null,
    };
  }

  const eventDetails: Record<string, HubEvent> = {};
  for (const e of events.data) {
    eventDetails[e.id] = {
      title: (gujarati && e.title_gu) || e.title,
      mandir: e.mandir.name,
      town: e.mandir.town,
      slug: e.mandir.slug,
      path: localePath(eventPath(e.mandir.slug, e.id)),
      cancelled: e.status === "cancelled",
    };
  }
  const allDay = new Map(events.data.map((e) => [e.id, e.all_day]));
  const when: Record<string, string> = {};
  for (const { id, at } of asked) {
    when[`${id}@${at}`] = formatEventStart(at, allDay.get(id) ?? false);
  }
  return {
    state: "ok",
    mandirs: mandirDetails,
    events: eventDetails,
    when,
  };
}
