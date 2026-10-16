// The seva rota a committee plans for an event: roles (Kitchen, Parking,
// Shoes) and shifts with how many people each needs. No volunteers' names
// are kept (decisions 0006 and 0013): the committee counts people who say
// yes in WhatsApp, and if it turns sign-up on, volunteers can take a slot
// on Toran without giving a name.

import { formatEventStart, londonToUtc } from "@/lib/format";

export type SevaError = "role" | "description" | "shift" | "needed";

export const SEVA_ERRORS: Record<SevaError, string> = {
  role: "Please give the role a name (2 to 60 characters).",
  description: "Please keep the role's description under 280 characters.",
  shift:
    "Please choose a date and a start and end time, with the end after the start.",
  needed: "Please say how many people are needed (1 to 500).",
};

export function checkRole(input: {
  name: string;
  description: string;
  dbs: boolean;
}):
  | {
      ok: true;
      role: { name: string; description: string | null; needs_dbs: boolean };
    }
  | { ok: false; error: SevaError } {
  const name = input.name.trim();
  const description = input.description.trim();
  if (name.length < 2 || name.length > 60) return { ok: false, error: "role" };
  if (description.length > 280) return { ok: false, error: "description" };
  return {
    ok: true,
    role: { name, description: description || null, needs_dbs: input.dbs },
  };
}

export function checkShift(input: {
  date: string;
  from: string;
  to: string;
  needed: string;
}):
  | { ok: true; shift: { starts_at: string; ends_at: string; needed: number } }
  | { ok: false; error: SevaError } {
  const start = londonToUtc(input.date, input.from);
  const end = londonToUtc(input.date, input.to);
  if (!start || !end || end <= start) return { ok: false, error: "shift" };
  const needed = Number(input.needed);
  if (!Number.isInteger(needed) || needed < 1 || needed > 500) {
    return { ok: false, error: "needed" };
  }
  return {
    ok: true,
    shift: {
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      needed,
    },
  };
}

// "Sun 8 Nov, 5pm–8pm"
export function shiftLabel(startsAt: string, endsAt: string): string {
  const end = formatEventStart(endsAt, false).split(", ").at(-1);
  return `${formatEventStart(startsAt, false)}–${end}`;
}

// How many of a shift's places are taken: people the committee counted in
// plus slots taken on Toran, never more than it needs.
export function placesTaken(shift: {
  needed: number;
  filled_offline?: number;
  taken_online?: number;
}): number {
  return Math.min(
    shift.needed,
    (shift.filled_offline ?? 0) + (shift.taken_online ?? 0),
  );
}

export type Rota = {
  name: string;
  description: string | null;
  needs_dbs: boolean;
  shifts: {
    starts_at: string;
    ends_at: string;
    needed: number;
    filled_offline?: number;
    taken_online?: number;
  }[];
}[];

// The rota as a message for the committee's volunteers' WhatsApp group.
// When volunteers can take slots on Toran (`open`), it says how many are
// taken so far and points to the link sent with it.
export function rotaMessage(
  eventTitle: string,
  when: string,
  rota: Rota,
  open = false,
) {
  const roles = rota
    .filter((r) => r.shifts.length)
    .map((r) => {
      const heading = `*${r.name}*${r.needs_dbs ? " (DBS check needed)" : ""}`;
      const shifts = [...r.shifts]
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        .map((s) =>
          open && !r.needs_dbs
            ? `• ${shiftLabel(s.starts_at, s.ends_at)}: ${placesTaken(s)} of ${s.needed} taken`
            : `• ${shiftLabel(s.starts_at, s.ends_at)}: ${s.needed} ${s.needed === 1 ? "person" : "people"}`,
        );
      return [
        heading,
        ...(r.description ? [r.description] : []),
        ...shifts,
      ].join("\n");
    });
  return [
    `Seva for ${eventTitle} (${when})`,
    ...roles,
    open
      ? "Take a slot at the link below, no sign-up needed. 🙏"
      : "Reply here if you can help. 🙏",
  ].join("\n\n");
}
