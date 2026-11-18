"use client";

import { useRef } from "react";
import { inputClass, pillButtonClass } from "@/components/ui";
import {
  AARTI_DAYS,
  AARTI_NAME_MAX,
  type Aarti,
  aartiDaysChoice,
  closeField,
  MAX_AARTIS,
  openField,
  type Session,
  SESSIONS_PER_DAY,
  type Weekday,
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

// Opening times (up to two sessions a day) and aarti times (each on its
// own days), for the committee's details form and Toran's mandir forms.
// Leave a day empty when the mandir is closed. Works without JavaScript;
// with it, one day's times can be copied to others.
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

  // Copies one day's times to others: the committee fills in one day,
  // copies it, then changes the days that differ.
  function copy(from: Weekday, to: readonly Weekday[]) {
    const form = box.current;
    if (!form) return;
    const field = (name: string) =>
      form.querySelector<HTMLInputElement>(`input[name="${name}"]`);
    for (const day of to) {
      for (let s = 0; s < SESSIONS_PER_DAY; s++) {
        for (const name of [openField, closeField]) {
          const a = field(name(from, s));
          const b = field(name(day, s));
          if (a && b) b.value = a.value;
        }
      }
    }
  }

  return (
    <fieldset ref={box} className="flex flex-col gap-4">
      <legend className="font-semibold">Opening times</legend>
      <p className="text-muted text-base">
        When the mandir is open for darshan. Each day has its own times, in up
        to two sessions (most mandirs close in the afternoon). Fill in Monday,
        copy it to the other days, then change any day that&apos;s different,
        such as the weekend. Leave a day empty if it&apos;s closed.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copy(1, WEEKDAYS.slice(1))}
          className={pillButtonClass}
        >
          Copy Monday&apos;s times to every day
        </button>
        <button
          type="button"
          onClick={() => copy(1, [2, 3, 4, 5])}
          className={pillButtonClass}
        >
          Copy Monday&apos;s times to Tue – Fri
        </button>
        <button
          type="button"
          onClick={() => copy(6, [7])}
          className={pillButtonClass}
        >
          Copy Saturday&apos;s times to Sunday
        </button>
      </div>
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
          Each aarti, its time and the days it&apos;s on: for example Mangla
          aarti at 7:30, every day. If an aarti is at a different time on some
          days, give it twice, such as Sandhya aarti at 18:00 Monday to Saturday
          and at 16:30 on Sundays.
        </p>
        {Array.from({ length: MAX_AARTIS }, (_, n) => {
          const aarti = aartis[n];
          const choice = aarti ? aartiDaysChoice(aarti) : "all";
          return (
            <div
              key={n}
              className="group/days border-line grid grid-cols-[1fr_11rem] gap-3 border-b pb-3"
            >
              <label className="flex flex-col gap-1">
                <span className="text-muted text-base">Aarti {n + 1}</span>
                <input
                  name={`aarti-name-${n}`}
                  maxLength={AARTI_NAME_MAX}
                  defaultValue={aarti?.name ?? ""}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted text-base">Time</span>
                <input
                  type="time"
                  name={`aarti-time-${n}`}
                  defaultValue={aarti?.time ?? ""}
                  className={timeClass}
                />
              </label>
              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-muted text-base">Which days?</span>
                <select
                  name={`aarti-days-${n}`}
                  defaultValue={choice}
                  className={inputClass}
                >
                  {AARTI_DAYS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                  <option value="custom">Choose the days…</option>
                </select>
              </label>
              {/* The days one by one, when "Choose the days…" is picked. */}
              <fieldset className="col-span-2 hidden flex-wrap gap-x-4 gap-y-2 group-has-[option[value=custom]:checked]/days:flex">
                <legend className="sr-only">The days for aarti {n + 1}</legend>
                {WEEKDAYS.map((d) => (
                  <label key={d} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name={`aarti-day-${n}`}
                      value={d}
                      defaultChecked={
                        choice === "custom" && !!aarti?.days?.includes(d)
                      }
                      className="accent-peacock size-5"
                    />
                    {DAYS[d - 1].slice(0, 3)}
                  </label>
                ))}
              </fieldset>
            </div>
          );
        })}
      </fieldset>
    </fieldset>
  );
}
