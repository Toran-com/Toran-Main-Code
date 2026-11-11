"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { buttonClass, quietButtonClass } from "@/components/ui";
import { readSamplePoster } from "@/app/(public)/(directory)/demo/poster/actions";
import type { DemoPoster, DemoReading } from "@/lib/poster-demo";

// "Watch AI read a poster": choose one of the sample posters, have it
// read, then check each draft as a committee would. Nothing is saved.

type Check = "right" | "change";

const PROBLEMS: Record<Exclude<DemoReading, { ok: true }>["error"], string> = {
  off: "Reading posters isn't switched on for this copy of Toran, so the posters can't be read here.",
  busy: "A lot of people are trying this just now. Please try again in a few minutes.",
  refused:
    "Claude wouldn't read this poster. On Toran, a person would type it up instead.",
  failed: "The poster couldn't be read just now. Please try again in a minute.",
  unknown: "Choose one of the posters first.",
};

export function PosterDemo({
  posters,
  on,
}: {
  posters: Pick<DemoPoster, "id" | "name" | "about" | "alt">[];
  on: boolean;
}) {
  const [chosen, setChosen] = useState(posters[0].id);
  const [reading, setReading] = useState<DemoReading | null>(null);
  const [checks, setChecks] = useState<Record<number, Check>>({});
  const [justChecked, setJustChecked] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const results = useRef<HTMLParagraphElement>(null);
  const poster = posters.find((p) => p.id === chosen) ?? posters[0];

  // When the drafts arrive, take keyboard and screen-reader users to them.
  useEffect(() => {
    if (reading?.ok) results.current?.focus();
  }, [reading]);

  // The buttons go once a draft is checked, so keep focus on its card.
  useEffect(() => {
    if (justChecked !== null)
      document.getElementById(`draft-${justChecked}`)?.focus();
  }, [justChecked]);

  const check = (i: number, value: Check) => {
    setChecks((c) => ({ ...c, [i]: value }));
    setJustChecked(i);
  };

  const choose = (id: string) => {
    setChosen(id);
    setReading(null);
    setChecks({});
    setJustChecked(null);
  };

  const read = () =>
    startTransition(async () => {
      setReading(null);
      setChecks({});
      setJustChecked(null);
      let result: DemoReading;
      try {
        result = await readSamplePoster(chosen);
      } catch {
        result = { ok: false, error: "failed" };
      }
      setReading(result);
    });

  const drafts = reading?.ok ? reading.drafts : [];
  const allChecked =
    drafts.length > 0 && drafts.every((_, i) => checks[i] !== undefined);

  return (
    <div className="flex flex-col gap-10">
      <fieldset className="flex flex-col gap-4">
        <legend className="font-display mb-4 text-3xl leading-tight">
          1. Choose a poster
        </legend>
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-6">
          {posters.map((p) => (
            <label
              key={p.id}
              className={`bg-surface flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-3 transition-colors sm:flex-col sm:items-stretch sm:gap-3 ${
                p.id === chosen
                  ? "border-peacock shadow-card"
                  : "border-line hover:border-peacock/50"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- small pictures, already the right size */}
              <img
                src={`/demo-posters/${p.id}-small.webp`}
                alt={p.alt}
                width={324}
                height={405}
                className="h-auto w-24 shrink-0 rounded-lg sm:w-full"
              />
              <span className="flex items-start gap-2">
                <input
                  type="radio"
                  name="poster"
                  value={p.id}
                  checked={p.id === chosen}
                  onChange={() => choose(p.id)}
                  className="accent-peacock mt-1.5 size-5 shrink-0"
                />
                <span className="flex flex-col">
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-muted text-base">{p.about}</span>
                </span>
              </span>
            </label>
          ))}
        </div>
        <a
          href={`/demo-posters/${poster.id}.jpg`}
          className="text-peacock self-start text-base underline"
        >
          Open the {poster.name} full size
        </a>
      </fieldset>

      <section aria-labelledby="read" className="flex flex-col gap-4">
        <h2 id="read" className="font-display text-3xl leading-tight">
          2. Have it read
        </h2>
        {on ? (
          <button
            type="button"
            onClick={read}
            disabled={pending}
            className={`${buttonClass} sm:w-auto sm:self-start`}
          >
            {pending ? "Reading the poster…" : "Read this poster"}
          </button>
        ) : (
          <p className="bg-sunk rounded-2xl px-5 py-4">{PROBLEMS.off}</p>
        )}
        <div className="flex flex-col gap-6">
          <p role="status" className="text-muted empty:hidden">
            {pending
              ? "Claude is reading the poster. This takes about ten seconds."
              : ""}
          </p>
          {pending && (
            <div className="flex flex-col gap-4" aria-hidden="true">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="bg-sunk h-36 animate-pulse rounded-3xl motion-reduce:animate-none"
                />
              ))}
            </div>
          )}
          {reading && !reading.ok && (
            <p role="alert" className="text-kumkum font-semibold">
              {PROBLEMS[reading.error]}
            </p>
          )}
          {reading?.ok && (
            <>
              <p ref={results} tabIndex={-1} className="text-lg outline-none">
                {drafts.length === 0
                  ? "Claude found no dated events on this poster, so it made none up."
                  : `Claude found ${drafts.length} event${drafts.length === 1 ? "" : "s"}, in ${reading.seconds} seconds. Each is a draft until a person checks it.`}
              </p>
              {drafts.length > 0 && (
                <ul className="flex flex-col gap-4">
                  {drafts.map((d, i) => (
                    <li
                      key={`${d.title}-${d.when}`}
                      className="border-line bg-surface shadow-card flex flex-col gap-3 rounded-3xl border p-5 sm:p-6"
                    >
                      <p
                        id={`draft-${i}`}
                        tabIndex={-1}
                        className="text-base font-semibold outline-none"
                      >
                        {checks[i] === "right" ? (
                          <span className="text-peacock">
                            ✓ Checked: would be published
                          </span>
                        ) : checks[i] === "change" ? (
                          <span className="text-ink">
                            Would be changed before publishing
                          </span>
                        ) : (
                          <span className="bg-marigold/20 text-ink inline-block rounded-2xl px-3 py-1">
                            Draft · waiting for a person to check
                          </span>
                        )}
                      </p>
                      <h3 className="font-display text-2xl leading-tight">
                        {d.title}
                        {d.titleGu && (
                          <span lang="gu" className="text-muted block text-xl">
                            {d.titleGu}
                          </span>
                        )}
                      </h3>
                      <p className="font-semibold">{d.when}</p>
                      {d.summary && <p className="text-muted">{d.summary}</p>}
                      <p className="text-muted text-base">{d.kind}</p>
                      {checks[i] === undefined && (
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => check(i, "right")}
                            className={quietButtonClass}
                          >
                            Looks right
                          </button>
                          <button
                            type="button"
                            onClick={() => check(i, "change")}
                            className={quietButtonClass}
                          >
                            Needs a change
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {allChecked && (
                <p className="text-lg">
                  On Toran, the events that look right would now go live, and
                  the others would be corrected first. This is only a demo, so
                  nothing has been saved.
                </p>
              )}
              <dl className="bg-sunk grid gap-x-6 gap-y-3 rounded-3xl p-5 sm:grid-cols-[auto_1fr] sm:p-6">
                <dt className="font-semibold">Sent to Claude</dt>
                <dd>Only the picture of the poster.</dd>
                <dt className="font-semibold">Kept</dt>
                <dd>Nothing: the picture isn&apos;t stored.</dd>
                {(reading.leftOut.length > 0 || reading.keptIn.length > 0) && (
                  <>
                    <dt className="font-semibold">Private details</dt>
                    <dd>
                      {reading.leftOut.length > 0 &&
                        `Left out: ${reading.leftOut.join(", ")}. `}
                      {reading.keptIn.length > 0 &&
                        `Not left out: ${reading.keptIn.join(", ")}. The person checking would remove it.`}
                    </dd>
                  </>
                )}
                <dt className="font-semibold">Read</dt>
                <dd>
                  {readTime(reading.readAt)}, by Claude (Anthropic). Each poster
                  is read once a day, and everyone that day sees the same
                  reading.
                </dd>
              </dl>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

// "4 November at 9:19pm", in UK time.
function readTime(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/London",
  }).formatToParts(new Date(iso));
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  const hour = Number(part("hour"));
  return `${part("day")} ${part("month")} at ${hour % 12 || 12}:${part("minute")}${hour < 12 ? "am" : "pm"}`;
}
