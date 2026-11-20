"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui";

// One of the mandir's coming events, to link a seva to: when it next
// starts (and ends, if the committee gave an end time), in UK time.
export type SevaEventChoice = {
  id: string;
  label: string;
  title: string;
  // YYYY-MM-DD, and HH:MM (empty for an all-day event, or no end time).
  date: string;
  from: string;
  to: string;
};

// The add-seva form's "Is it for one of your events?" and its day and
// times. Choosing an event puts in when it starts, and ends if known; the
// committee can still change them (setting up starts earlier, say). Seva
// on its own is given its own day and times. Works without JavaScript:
// then the times are typed in either way.
export function SevaEventAndTime({
  events,
  chosen = "",
}: {
  events: readonly SevaEventChoice[];
  chosen?: string;
}) {
  const start = events.find((e) => e.id === chosen);
  const [event, setEvent] = useState(start?.id ?? "");
  const [date, setDate] = useState(start?.date ?? "");
  const [from, setFrom] = useState(start?.from ?? "");
  const [to, setTo] = useState(start?.to ?? "");
  const picked = events.find((e) => e.id === event);

  function choose(id: string) {
    setEvent(id);
    const e = events.find((x) => x.id === id);
    if (!e) return;
    setDate(e.date);
    if (e.from) setFrom(e.from);
    if (e.to) setTo(e.to);
  }

  return (
    <>
      <label className="col-span-2 flex flex-col gap-2">
        <span className="font-semibold">Is it for one of your events?</span>
        <select
          name="event"
          value={event}
          onChange={(e) => choose(e.target.value)}
          className={inputClass}
        >
          <option value="">No, it&apos;s on its own</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </label>
      {picked && (
        <p className="text-muted col-span-2 text-base" role="status">
          We&apos;ve put in when {picked.title} starts. Change the times if the
          seva is different, such as setting up before or clearing away after.
        </p>
      )}
      <label className="col-span-2 flex flex-col gap-1">
        <span className="font-semibold">Day</span>
        <input
          name="date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">From</span>
        <input
          name="from"
          type="time"
          required
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">To</span>
        <input
          name="to"
          type="time"
          required
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={inputClass}
        />
      </label>
    </>
  );
}
