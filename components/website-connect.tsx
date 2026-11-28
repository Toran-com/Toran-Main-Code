"use client";

import { useActionState } from "react";
import type { ConnectState } from "@/app/(mandir)/manage/[slug]/actions";
import { buttonClass, inputClass, Notice } from "@/components/ui";

// "Connect your website" (decision 0032): one address and one button.
// Toran reads the website while the committee waits (up to half a
// minute), then says what it found and what it did with it.

const PROBLEMS = {
  address:
    "That doesn't look like a website address. Try it as it appears in your browser, such as www.yourmandir.org.uk.",
  calendar:
    "That's a calendar's address. Add it under “Your mandir → Your calendar” instead, and Toran will read it every night.",
  unreachable:
    "Toran couldn't open that website. Check the address, or try again in a while.",
  failed: "That didn't work. Try again in a minute.",
};

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export function WebsiteConnectForm({
  slug,
  website,
  autoPublish = true,
  readPosters = true,
  readingOn,
  action,
  again = false,
  helpAction,
  forwardTo,
}: {
  slug: string;
  website: string;
  autoPublish?: boolean;
  readPosters?: boolean;
  // Whether posters can be read with AI here (ANTHROPIC_API_KEY).
  readingOn: boolean;
  action: (state: ConnectState, form: FormData) => Promise<ConnectState>;
  // Already connected: the button reads it again.
  again?: boolean;
  helpAction: (form: FormData) => Promise<void>;
  // The mandir's forwarding address, when forwarding is on.
  forwardTo: string | null;
}) {
  const [state, run, pending] = useActionState(action, {});
  const r = state.result;
  const nothing = r && r.found === 0 && r.posters === 0;
  return (
    <div className="flex flex-col gap-4">
      {r ? (
        <div
          role="status"
          className={`${nothing ? "border-marigold bg-marigold/10" : "border-leaf bg-leaf/10"} flex flex-col gap-2 rounded-2xl border-l-4 p-4`}
          data-testid="website-result"
        >
          <p className="font-semibold">
            {nothing
              ? "Connected, but no events found yet"
              : "Connected. Toran will keep up with your website every night."}
          </p>
          {r.found > 0 && (
            <p>
              Toran found {plural(r.found, "event", "events")} on your website
              {r.published > 0
                ? `: ${plural(r.published, "is", "are")} now on your page`
                : ""}
              {r.queued > 0
                ? `${r.published > 0 ? ", and " : ": "}${plural(r.queued, "waits", "wait")} for you under “Posters waiting for you”`
                : ""}
              {r.published === 0 && r.queued === 0
                ? ", all already on your page"
                : ""}
              .
            </p>
          )}
          {r.posters > 0 && (
            <p>
              It also found{" "}
              {plural(r.posters, "poster or patrika", "posters and patrikas")}.
              {r.readingPosters > 0
                ? ` It's reading ${r.readingPosters === 1 ? "it" : `${r.readingPosters} of them`} now: what it finds will wait under “Posters waiting for you” in a few minutes, for you to check.`
                : readingOn && readPosters
                  ? " It reads new ones each night, and what it finds waits for you to check."
                  : ""}
            </p>
          )}
          {r.outcome === "blocked" && (
            <p>
              Your website asks robots not to read it, so Toran stays away.
              Whoever runs it can allow “ToranBot”.
            </p>
          )}
          {nothing && r.outcome !== "blocked" && (
            <p>
              Your website doesn&apos;t show events in a way Toran can read yet.
              Toran will look again every night.
              {forwardTo
                ? ` Meanwhile, forward your posters to ${forwardTo}.`
                : ""}{" "}
              Or ask Toran to help connect it.
            </p>
          )}
        </div>
      ) : null}
      {state.error ? (
        <Notice tone="error">{PROBLEMS[state.error]}</Notice>
      ) : null}
      {nothing ? (
        <form action={helpAction}>
          <input type="hidden" name="slug" value={slug} />
          <button type="submit" className={buttonClass}>
            Ask Toran to help
          </button>
        </form>
      ) : null}
      {/* Connected and found something: the form has done its job (the
          card's "Check my website now" reads it again). */}
      <form
        action={run}
        className="flex flex-col gap-4"
        hidden={Boolean(r && !nothing && !again)}
      >
        <input type="hidden" name="slug" value={slug} />
        {again ? (
          <>
            <input type="hidden" name="website" value={website} />
            {autoPublish && (
              <input type="hidden" name="auto_publish" value="on" />
            )}
            {readPosters && (
              <input type="hidden" name="read_posters" value="on" />
            )}
          </>
        ) : (
          <>
            <label className="flex flex-col gap-2">
              <span className="font-semibold">Your website</span>
              <input
                name="website"
                required
                inputMode="url"
                autoComplete="url"
                defaultValue={website}
                placeholder="www.yourmandir.org.uk"
                className={inputClass}
              />
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="auto_publish"
                defaultChecked={autoPublish}
                className="mt-1 size-6 shrink-0"
              />
              <span>
                Put the events your website lists on Toran straight away
                <span className="text-muted block text-base">
                  Untick to check each one first.
                </span>
              </span>
            </label>
            {readingOn && (
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="read_posters"
                  defaultChecked={readPosters}
                  className="mt-1 size-6 shrink-0"
                />
                <span>
                  Read the posters and patrikas on it too
                  <span className="text-muted block text-base">
                    Toran&apos;s AI reads them; you check what it finds.
                  </span>
                </span>
              </label>
            )}
          </>
        )}
        <button
          type="submit"
          className={buttonClass}
          disabled={pending}
          aria-busy={pending}
        >
          {pending
            ? "Reading your website…"
            : again
              ? "Check my website now"
              : "Connect my website"}
        </button>
        {pending && (
          <p className="text-muted" aria-live="polite">
            This can take up to half a minute.
          </p>
        )}
      </form>
    </div>
  );
}
