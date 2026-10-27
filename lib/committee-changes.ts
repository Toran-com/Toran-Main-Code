// "What's changed": events on a mandir's page added, changed, cancelled
// or removed in the last fortnight, and by whom where that's known, so a
// committee sees what Toran, its website or a visitor's tip put there.

export const CHANGES_DAYS = 14;
const MINUTE_MS = 60_000;

export type ChangedEvent = {
  id: string;
  title: string;
  status: string;
  origin: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
};

export type Change = {
  id: string;
  title: string;
  what: "Added" | "Changed" | "Cancelled" | "Removed";
  by: string | null;
  at: string;
};

const ORIGINS: Record<string, string> = {
  website: "from your website",
  visitor: "from a visitor's tip",
  poster: "from a poster",
};

function who(
  e: ChangedEvent,
  me: string,
  committee: ReadonlySet<string>,
): string | null {
  if (e.origin && ORIGINS[e.origin]) return ORIGINS[e.origin];
  if (!e.created_by) return null;
  if (e.created_by === me) return "by you";
  if (committee.has(e.created_by)) return "by your committee";
  return "by Toran";
}

export function recentChanges(
  events: readonly ChangedEvent[],
  me: string,
  committee: ReadonlySet<string>,
  now: Date,
  limit = 8,
): Change[] {
  const since = now.getTime() - CHANGES_DAYS * 86_400_000;
  return events
    .flatMap((e): Change[] => {
      const created = Date.parse(e.created_at);
      const updated = Date.parse(e.updated_at);
      if (updated < since) return [];
      // Saved again within a minute of being added is still "added".
      const edited = updated - created > MINUTE_MS;
      // Added and taken away straight after (a save that didn't finish)
      // isn't a change anyone made.
      if (e.status === "removed" && !edited) return [];
      const what: Change["what"] =
        e.status === "removed"
          ? "Removed"
          : e.status === "cancelled"
            ? "Cancelled"
            : edited
              ? "Changed"
              : "Added";
      if (what === "Added" && created < since) return [];
      return [
        {
          id: e.id,
          title: e.title,
          what,
          // Only who added it is recorded, not who changed it since.
          by: what === "Added" ? who(e, me, committee) : null,
          at: e.updated_at,
        },
      ];
    })
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit);
}
