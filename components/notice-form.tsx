"use client";

import { useRef, useState } from "react";
import { buttonClass, inputClass, pillButtonClass } from "@/components/ui";

// The committee's "Post a notice" form: ready-made starts that fill the
// box (to finish or change), the words, and how long it shows. Works
// without JavaScript too: type the words, choose how long.
export function NoticeForm({
  slug,
  action,
  picks,
  max,
  today,
  lastDay,
}: {
  slug: string;
  action: (formData: FormData) => void | Promise<void>;
  picks: readonly string[];
  max: number;
  // YYYY-MM-DD: today, and the furthest a notice can run (a month).
  today: string;
  lastDay: string;
}) {
  const box = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [length, setLength] = useState("today");
  const lengths = [
    { value: "today", label: "Today" },
    { value: "tomorrow", label: "Today and tomorrow" },
    { value: "week", label: "The next 7 days" },
    { value: "date", label: "Choose when it ends" },
  ];
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      <div className="flex flex-col gap-2">
        <p className="text-muted text-base">Start from one of these:</p>
        <div className="flex flex-wrap gap-2">
          {picks.map((pick) => (
            <button
              key={pick}
              type="button"
              className={pillButtonClass}
              onClick={() => {
                setText(pick);
                // Ready to finish the sentence or change it.
                requestAnimationFrame(() => {
                  const el = box.current;
                  el?.focus();
                  el?.setSelectionRange(pick.length, pick.length);
                });
              }}
            >
              {pick.replace(/:?\s*$/, "").replace(/\.$/, "")}
            </button>
          ))}
        </div>
      </div>
      <label className="flex flex-col gap-2">
        <span className="font-semibold">The notice</span>
        <textarea
          ref={box}
          name="body"
          required
          minLength={3}
          maxLength={max}
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={inputClass}
        />
        <span className="text-muted text-base">
          {text.length} of {max} characters. Families see it at the top of your
          page and your events&apos; pages.
        </span>
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">Show it for</legend>
        {lengths.map((l) => (
          <label key={l.value} className="flex min-h-11 items-center gap-3">
            <input
              type="radio"
              name="length"
              value={l.value}
              checked={length === l.value}
              onChange={() => setLength(l.value)}
              className="size-5"
            />
            {l.label}
          </label>
        ))}
        <input
          type="date"
          name="until"
          aria-label="It ends on"
          min={today}
          max={lastDay}
          defaultValue={today}
          required={length === "date"}
          hidden={length !== "date"}
          className={inputClass}
        />
      </fieldset>
      <button type="submit" className={buttonClass}>
        Post the notice
      </button>
    </form>
  );
}
