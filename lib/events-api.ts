import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  checkEvent,
  type CheckedEvent,
  type EventError,
  type EventInput,
} from "@/lib/event-form";
import { guessKind } from "@/lib/event-kinds";
import { saveEvent, updateEvent } from "@/lib/event-store";
import { checkLink } from "@/lib/posters";
import { eventPath } from "@/lib/share";
import { SendLimiter } from "@/lib/spam";

// The events API (decision 0032): a mandir's own website or booking
// system puts its events on Toran, changes them and cancels them, each by
// its own id, with a key the committee makes on its committee page. Each
// event is published straight away as the mandir's own, the same as one a
// committee member types in, and checked by the same rules
// (lib/event-form.ts). Documented for the mandir's web developer at
// /for-mandirs/events-api.

type Db = SupabaseClient<Database>;

export const KEY_START = "toran_";
// The instructions for a mandir's web developer.
export const EVENTS_API_PATH = "/for-mandirs/events-api";
// The most events in one request, and requests per key in ten minutes.
export const MAX_BATCH = 100;
export const REQUESTS_PER_WINDOW = 300;

export const apiLimiter = new SendLimiter(REQUESTS_PER_WINDOW, 10 * 60_000);

// A new key: shown to the committee once; only its hash is kept.
export function newApiKey(): { key: string; hash: string; prefix: string } {
  const key = `${KEY_START}${randomBytes(32).toString("base64url")}`;
  return {
    key,
    hash: hashApiKey(key),
    prefix: key.slice(0, KEY_START.length + 4),
  };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

// The key from "Authorization: Bearer toran_…", if it looks like one.
export function bearerKey(header: string | null): string | null {
  const match = header?.match(/^Bearer\s+(toran_[A-Za-z0-9_-]{43})\s*$/);
  return match ? match[1] : null;
}

// The mandir system's own id for an event: letters, digits and . _ : @ -.
export function isExternalId(id: string): boolean {
  return /^[A-Za-z0-9._:@-]{1,100}$/.test(id);
}

// The mandir a request's key is for, or null for a missing, unknown or
// stopped key.
export async function keyMandir(
  db: Db,
  header: string | null,
): Promise<KeyMandir | null> {
  const key = bearerKey(header);
  if (!key) return null;
  const { data } = await db.rpc("mandir_for_api_key", {
    hash: hashApiKey(key),
  });
  return (data as KeyMandir | null) ?? null;
}

export type KeyMandir = {
  key: string;
  id: string;
  slug: string;
  name: string;
  town: string;
};

// What each check's failure means, for whoever wrote the mandir's system.
const FIELD_PROBLEMS: Record<EventError, [string, string]> = {
  title: ["title", "Give a title of 2 to 120 characters."],
  summary: ["summary", "Keep the summary to 280 characters."],
  titleGu: [
    "title_gu",
    "Give a Gujarati title of 2 to 120 characters, or leave it out.",
  ],
  summaryGu: ["summary_gu", "Keep the Gujarati summary to 280 characters."],
  kind: [
    "kind",
    "Use one of: festival, aarti, bhajan, katha, class, seva, youth, community, other.",
  ],
  date: [
    "date",
    "Give the date as YYYY-MM-DD, from today up to two years ahead.",
  ],
  time: [
    "time",
    "Give the start time as HH:MM (24-hour, UK time), or leave it out for all day.",
  ],
  repeat: [
    "repeat",
    "Use one of: none, daily, weekly, fortnightly, monthly, monthly-last.",
  ],
  until: [
    "until",
    "Give the last date as YYYY-MM-DD, after the date and within a year of it.",
  ],
  endTime: [
    "end_time",
    "Give the end time as HH:MM, after the start time, on the same day.",
  ],
  cost: ["cost_note", "Keep the cost to 80 characters."],
  ticketsUrl: ["tickets_url", "Give the booking link as a web address."],
  locationNote: ["location_note", "Keep the location note to 160 characters."],
  venue: [
    "venue_name",
    "Give both venue_name (2 to 120 characters) and venue_postcode, or neither.",
  ],
  venuePostcode: ["venue_postcode", "Give a UK postcode."],
  languages: [
    "languages",
    "Give up to four of: en, gu, hi, ta, pa, te, bn, mr, kn, ml, sa.",
  ],
};

export type ApiProblem = { field: string; message: string };

export type ParsedEvent = {
  input: EventInput;
  link: string | null;
  cancelled: boolean;
};

// One event as the mandir's system sends it, read into what the
// committee page's form would send. Unknown fields are ignored.
export function readApiEvent(
  body: unknown,
): { ok: true; event: ParsedEvent } | { ok: false; problem: ApiProblem } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      problem: { field: "", message: "Send the event as a JSON object." },
    };
  }
  const b = body as Record<string, unknown>;
  for (const [field, value] of Object.entries(b)) {
    const allowed =
      field === "languages"
        ? Array.isArray(value) && value.every((v) => typeof v === "string")
        : field === "booking_required"
          ? typeof value === "boolean"
          : field === "id"
            ? typeof value === "string"
            : value === null || typeof value === "string";
    if (!allowed) {
      return {
        ok: false,
        problem: {
          field,
          message:
            field === "languages"
              ? "Give languages as a list of codes."
              : field === "booking_required"
                ? "Give booking_required as true or false."
                : `Give ${field} as text.`,
        },
      };
    }
  }
  const text = (field: string) =>
    typeof b[field] === "string" ? (b[field] as string).trim() : "";
  const status = text("status") || "published";
  if (status !== "published" && status !== "cancelled") {
    return {
      ok: false,
      problem: { field: "status", message: "Use published or cancelled." },
    };
  }
  const link = text("link");
  if (link && !checkLink(link)) {
    return {
      ok: false,
      problem: {
        field: "link",
        message: "Give the link as a web address (https://…).",
      },
    };
  }
  const title = text("title");
  const summary = text("summary");
  return {
    ok: true,
    event: {
      input: {
        title,
        date: text("date"),
        time: text("time"),
        end_time: text("end_time"),
        summary,
        repeat: text("repeat") || "none",
        until: text("until"),
        title_gu: text("title_gu"),
        summary_gu: text("summary_gu"),
        kind: text("kind") || guessKind(`${title} ${summary}`),
        cost_note: text("cost_note"),
        tickets: b.booking_required === true ? "needed" : "",
        tickets_url: text("tickets_url"),
        location_note: text("location_note"),
        venue_name: text("venue_name"),
        venue_postcode: text("venue_postcode"),
        languages: Array.isArray(b.languages) ? (b.languages as string[]) : [],
      },
      link: link || null,
      cancelled: status === "cancelled",
    },
  };
}

// The checked event, or what's wrong with it.
export function checkApiEvent(
  event: ParsedEvent,
  now: Date = new Date(),
): { ok: true; event: CheckedEvent } | { ok: false; problem: ApiProblem } {
  const checked = checkEvent(event.input, now);
  if (checked.ok) return checked;
  const [field, message] = FIELD_PROBLEMS[checked.error];
  return { ok: false, problem: { field, message } };
}

export type ApiResult =
  | {
      status: 200 | 201;
      body: {
        id: string;
        toran_id: string;
        url: string;
        status: "published" | "cancelled";
        created: boolean;
      };
    }
  | {
      status: 400 | 404 | 409 | 422 | 500;
      body: { error: string; field?: string };
    };

// Puts one event on the mandir's page, or changes the one it put there
// before with the same id. An event already on the page with the same name
// on the same day (typed in by the committee, say) is taken over, unless
// the system already has it under another id.
export async function putApiEvent(
  db: Db,
  mandir: KeyMandir,
  externalId: string,
  body: unknown,
  { siteUrl, now = new Date() }: { siteUrl: string; now?: Date },
): Promise<ApiResult> {
  if (!isExternalId(externalId)) {
    return {
      status: 400,
      body: {
        error: "The id must be 1 to 100 letters, digits or . _ : @ -",
        field: "id",
      },
    };
  }
  const read = readApiEvent(body);
  if (!read.ok)
    return {
      status: 422,
      body: { error: read.problem.message, field: read.problem.field },
    };
  const checked = checkApiEvent(read.event, now);
  if (!checked.ok) {
    return {
      status: 422,
      body: { error: checked.problem.message, field: checked.problem.field },
    };
  }
  const event = checked.event;
  const status = read.event.cancelled ? "cancelled" : "published";

  const { data: known } = await db
    .from("api_events")
    .select("event_id, event:events (status)")
    .eq("mandir_id", mandir.id)
    .eq("external_id", externalId)
    .maybeSingle();
  let eventId =
    known?.event && known.event.status !== "removed" ? known.event_id : null;
  let created = false;

  if (eventId) {
    const updated = await updateEvent(db, eventId, event);
    if (!updated.ok) {
      return updated.duplicate
        ? {
            status: 409,
            body: {
              error: `Another event with that name is already on the page that day: ${siteUrl}${eventPath(mandir.slug, updated.duplicate)}`,
            },
          }
        : {
            status: 500,
            body: { error: "Toran couldn't save it. Try again." },
          };
    }
  } else {
    const saved = await saveEvent(db, mandir.id, event, {
      confirmed: true,
      link: read.event.link,
      origin: "api",
    });
    if (saved.ok) {
      eventId = saved.id;
      created = true;
    } else if (saved.duplicate) {
      // Already on the page: the system takes it over, unless it already
      // has it under another id.
      const { data: claimed } = await db
        .from("api_events")
        .select("external_id")
        .eq("event_id", saved.duplicate)
        .maybeSingle();
      if (claimed && claimed.external_id !== externalId) {
        return {
          status: 409,
          body: {
            error: `That event is already on the page from your system, with the id ${claimed.external_id}.`,
          },
        };
      }
      const updated = await updateEvent(db, saved.duplicate, event);
      if (!updated.ok) {
        return {
          status: 500,
          body: { error: "Toran couldn't save it. Try again." },
        };
      }
      eventId = saved.duplicate;
    } else {
      return {
        status: 500,
        body: { error: "Toran couldn't save it. Try again." },
      };
    }
  }

  // The link and whether it's cancelled aren't part of an edit.
  await db
    .from("events")
    .update({ status, ...(created ? {} : { link: read.event.link }) })
    .eq("id", eventId);
  await db.from("api_events").upsert(
    {
      mandir_id: mandir.id,
      external_id: externalId,
      event_id: eventId,
      key_id: mandir.key,
      updated_at: now.toISOString(),
    },
    { onConflict: "mandir_id,external_id" },
  );
  return {
    status: created ? 201 : 200,
    body: {
      id: externalId,
      toran_id: eventId,
      url: `${siteUrl}${eventPath(mandir.slug, eventId)}`,
      status,
      created,
    },
  };
}

// Takes an event the system put on the page off it altogether.
export async function removeApiEvent(
  db: Db,
  mandir: KeyMandir,
  externalId: string,
): Promise<{ status: 204 | 404 | 500; body?: { error: string } }> {
  const { data: known } = await db
    .from("api_events")
    .select("event_id")
    .eq("mandir_id", mandir.id)
    .eq("external_id", externalId)
    .maybeSingle();
  if (!known) return { status: 404, body: { error: "No event with that id." } };
  const { error } = await db
    .from("events")
    .update({ status: "removed" })
    .eq("id", known.event_id)
    .eq("mandir_id", mandir.id);
  if (error)
    return {
      status: 500,
      body: { error: "Toran couldn't remove it. Try again." },
    };
  await db
    .from("api_events")
    .delete()
    .eq("mandir_id", mandir.id)
    .eq("external_id", externalId);
  return { status: 204 };
}

// The events the system has on the page, newest change first.
export async function listApiEvents(
  db: Db,
  mandir: KeyMandir,
  siteUrl: string,
) {
  const { data } = await db
    .from("api_events")
    .select(
      "external_id, updated_at, event:events (id, title, starts_at, all_day, status)",
    )
    .eq("mandir_id", mandir.id)
    .order("updated_at", { ascending: false })
    .limit(1000);
  return (data ?? []).flatMap((row) =>
    row.event && row.event.status !== "removed"
      ? [
          {
            id: row.external_id,
            toran_id: row.event.id,
            title: row.event.title,
            starts_at: row.event.starts_at,
            all_day: row.event.all_day,
            status: row.event.status,
            url: `${siteUrl}${eventPath(mandir.slug, row.event.id)}`,
            updated_at: row.updated_at,
          },
        ]
      : [],
  );
}
