// Upcoming events for a list: one-off events by their start, repeating
// ones by their next date that isn't cancelled.

export type EventWithDates = {
  starts_at: string;
  recurrence: string | null;
  event_occurrences?: { starts_at: string; cancelled: boolean }[] | null;
};

export function withNextStart<T extends EventWithDates>(
  rows: readonly T[],
  from: string,
): (T & { next_starts_at: string })[] {
  return rows
    .flatMap((row) => {
      if (!row.recurrence) {
        return row.starts_at >= from
          ? [{ ...row, next_starts_at: row.starts_at }]
          : [];
      }
      const next = (row.event_occurrences ?? [])
        .filter((o) => !o.cancelled && o.starts_at >= from)
        .map((o) => o.starts_at)
        .sort()[0];
      return next ? [{ ...row, next_starts_at: next }] : [];
    })
    .sort(
      (a, b) =>
        new Date(a.next_starts_at).getTime() -
        new Date(b.next_starts_at).getTime(),
    );
}

// The PostgREST filter for "one-off events from this time, or any repeating
// event" (repeating events are narrowed by their dates afterwards).
export function upcomingFilter(from: string): string {
  return `starts_at.gte."${from}",recurrence.not.is.null`;
}
