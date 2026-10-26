"use client";

import { useRef } from "react";
import { inputClass } from "@/components/ui";
import {
  AARTI_NAME_MAX,
  type Aarti,
  closeField,
  MAX_AARTIS,
  openField,
  type Session,
  SESSIONS_PER_DAY,
  WEEKDAYS,
} from "@/lib/opening-hours";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const timeClass = `${inputClass} w-full min-w-0 px-3`;

// Opening times (up to two sessions a day) and aarti times, for the
// committee's details form and Toran's mandir forms. Leave a day empty
// when the mandir is closed. Works without JavaScript; with it, Monday's
// times can be copied to every day.
export function HoursFields({
  sessions = [],
  aartis = [],
}: {
  sessions?: readonly Session[];
  aartis?: readonly Aarti[];
}) {
  const box = useRef<HTMLFieldSetElement>(null);
  const value = (day: number, s: number, key: "opens" | "closes") =>
    sessions.filter((x) => x.day === day)[s]?.[key] ?? "";

  function copyMonday() {
    const form = box.current;
    if (!form) return;
    const field = (name: string) =>
      form.querySelector<HTMLInputElement>(`input[name="${name}"]`);
    for (const day of WEEKDAYS.slice(1)) {
      for (let s = 0; s < SESSIONS_PER_DAY; s++) {
        for (const name of [openField, closeField]) {
          const from = field(name(1, s));
          const to = field(name(day, s));
          if (from && to) to.value = from.value;
        }
      }
    }
  }

  return (
    <fieldset ref={box} className="flex flex-col gap-4">
      <legend className="font-semibold">Opening times</legend>
      <p className="text-muted text-base">
        When the mandir is open for darshan, in up to two sessions a day. Leave
        a day empty if it&apos;s closed. The public page shows &ldquo;Open
        now&rdquo; or when it next opens.
      </p>
      <button
        type="button"
        onClick={copyMonday}
        className="text-peacock self-start font-semibold underline"
      >
        Copy Monday&apos;s times to every day
      </button>
      <div className="flex flex-col gap-3">
        {WEEKDAYS.map((day) => (
          <fieldset
            key={day}
            className="border-line grid grid-cols-2 gap-x-3 gap-y-2 border-b pb-3"
          >
            <legend className="mb-1 font-semibold">{DAYS[day - 1]}</legend>
            {Array.from({ length: SESSIONS_PER_DAY }, (_, s) => (
              <div key={s} className="contents">
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="text-muted text-base">
                    {s === 0 ? "Opens" : "Opens again"}
                  </span>
                  <input
                    type="time"
                    name={openField(day, s)}
                    defaultValue={value(day, s, "opens")}
                    className={timeClass}
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className="text-muted text-base">Closes</span>
                  <input
                    type="time"
                    name={closeField(day, s)}
                    defaultValue={value(day, s, "closes")}
                    className={timeClass}
                  />
                </label>
              </div>
            ))}
          </fieldset>
        ))}
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="font-semibold">Aarti times</legend>
        <p className="text-muted text-base">
          The daily aartis, for example Mangla aarti at 7:30.
        </p>
        {Array.from({ length: MAX_AARTIS }, (_, n) => (
          <div key={n} className="grid grid-cols-[1fr_11rem] gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-muted text-base">Aarti {n + 1}</span>
              <input
                name={`aarti-name-${n}`}
                maxLength={AARTI_NAME_MAX}
                defaultValue={aartis[n]?.name ?? ""}
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-muted text-base">Time</span>
              <input
                type="time"
                name={`aarti-time-${n}`}
                defaultValue={aartis[n]?.time ?? ""}
                className={timeClass}
              />
            </label>
          </div>
        ))}
      </fieldset>
    </fieldset>
  );
}
