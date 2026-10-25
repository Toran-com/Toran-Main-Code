import Anthropic from "@anthropic-ai/sdk";
import type { EventInput } from "@/lib/event-form";
import { EVENT_KINDS, guessKind, isEventKind } from "@/lib/event-kinds";

// Reads the events off a poster or patrika (a photo or a PDF) with Claude,
// so Toran doesn't have to type them up. What it reads only ever goes into
// the review queue: a person checks every event before it's published.
// The picture is sent to Anthropic to be read and isn't kept by Toran;
// Claude is told to leave out people's names and phone numbers (decision
// 0006). Off unless ANTHROPIC_API_KEY is set (docs/decisions/0018).

export const POSTER_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;
type PosterType = (typeof POSTER_TYPES)[number];

// Phone photos are shrunk in the browser first; a PDF patrika can be
// bigger. Under Vercel's 4.5 MB limit on what a page can be sent.
export const MAX_POSTER_BYTES = 4 * 1024 * 1024;

const MODEL = "claude-opus-5-5";

export function posterReadingOn(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function isPosterType(type: string): type is PosterType {
  return (POSTER_TYPES as readonly string[]).includes(type);
}

export type ReadResult =
  | { ok: true; events: EventInput[] }
  | { ok: false; error: "refused" | "failed" };

const SCHEMA = {
  type: "object",
  properties: {
    events: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          title_gu: { type: "string" },
          date: { type: "string" },
          time: { type: "string" },
          summary: { type: "string" },
          summary_gu: { type: "string" },
          kind: { type: "string", enum: Object.keys(EVENT_KINDS) },
        },
        required: [
          "title",
          "title_gu",
          "date",
          "time",
          "summary",
          "summary_gu",
          "kind",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["events"],
  additionalProperties: false,
};

function instructions(mandir: string, today: string): string {
  return `You read posters and patrikas (programmes) from Hindu mandirs in the UK and list the events on them for Toran, a site where families find what's on at mandirs. This one is from ${mandir}. Today is ${today}.

List every event on it that has a date, one entry per event and day. For each:
- title: a short English name for the event, as families would say it (at most 80 characters). If the poster is only in Gujarati or Hindi, translate the name.
- title_gu: the name in Gujarati script if the poster gives one, otherwise "".
- date: YYYY-MM-DD. If the poster gives no year, use the next time that date comes on or after today.
- time: the start time, 24-hour HH:MM, or "" if it's all day or no time is given.
- summary: one or two plain English sentences on what happens (at most 250 characters), or "".
- summary_gu: the same in Gujarati if the poster has Gujarati text about it, otherwise "".
- kind: the closest of the listed kinds.

Leave out events that are before today. Never include a private person's name, phone number, email address or home address: give the details of the event only. Names of deities, festivals and the mandir are fine. If you can't read any dated events, return an empty list.`;
}

// Claude's answer, checked and turned into what the poster form would
// send. Anything malformed is dropped rather than guessed at.
export function toEventInputs(raw: unknown, today: string): EventInput[] {
  if (!raw || typeof raw !== "object" || !("events" in raw)) return [];
  const events = (raw as { events: unknown }).events;
  if (!Array.isArray(events)) return [];
  const text = (value: unknown, max: number) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";
  return events.flatMap((e): EventInput[] => {
    if (!e || typeof e !== "object") return [];
    const r = e as Record<string, unknown>;
    const title = text(r.title, 120);
    const date = text(r.date, 10);
    const time = text(r.time, 5);
    if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) {
      return [];
    }
    const summary = text(r.summary, 280);
    const kind = text(r.kind, 20);
    return [
      {
        title,
        date,
        time: /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : "",
        summary,
        repeat: "none",
        until: "",
        title_gu: text(r.title_gu, 120),
        summary_gu: text(r.summary_gu, 280),
        kind: isEventKind(kind) ? kind : guessKind(`${title} ${summary}`),
      },
    ];
  });
}

export async function readPoster(
  file: { data: Buffer; type: PosterType },
  context: { mandir: string; today: string },
  client: Pick<Anthropic, "beta"> = new Anthropic(),
): Promise<ReadResult> {
  const data = file.data.toString("base64");
  const picture: Anthropic.Beta.BetaContentBlockParam =
    file.type === "application/pdf"
      ? {
          type: "document",
          source: { type: "base64", media_type: file.type, data },
        }
      : {
          type: "image",
          source: { type: "base64", media_type: file.type, data },
        };
  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // If a safety check declines the picture, the API tries the
      // fallback model it picks for that case before giving up.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: SCHEMA },
      },
      system: instructions(context.mandir, context.today),
      messages: [
        {
          role: "user",
          content: [
            picture,
            { type: "text", text: "List the events on this poster." },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Reading a poster failed", error);
    return { ok: false, error: "failed" };
  }
  if (response.stop_reason === "refusal")
    return { ok: false, error: "refused" };
  const answer = response.content.find((block) => block.type === "text");
  if (!answer || answer.type !== "text") return { ok: false, error: "failed" };
  try {
    return {
      ok: true,
      events: toEventInputs(JSON.parse(answer.text), context.today),
    };
  } catch {
    return { ok: false, error: "failed" };
  }
}
