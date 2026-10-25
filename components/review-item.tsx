import Link from "next/link";
import type { ReactNode } from "react";
import { EventFields } from "@/components/event-fields";
import { PosterDetails } from "@/components/poster-details";
import { buttonClass, quietButtonClass } from "@/components/ui";
import type { Poster } from "@/lib/posters";
import { clockLabel } from "@/lib/duplicates";
import type { Duplicate } from "@/lib/review-queue";

// One thing waiting for review, for Toran (/ops/posters) and for a
// mandir's committee (its own page): what it says, a warning if it looks
// like something already there, and the buttons. "Fix something first"
// (`fixHref`) reloads the page with this item's details open to correct
// (`fixing`) before publishing, or, where Toran can't publish, before the
// committee does. Only that one form is on the page.
export function ReviewItem({
  id,
  mandirSlug,
  poster,
  duplicates,
  header,
  action,
  hidden = {},
  canPublish,
  fixHref,
  cancelHref,
  fixing,
}: {
  id: string;
  mandirSlug: string;
  poster: Poster;
  duplicates: Duplicate[];
  header?: ReactNode;
  action: (formData: FormData) => Promise<void>;
  hidden?: Record<string, string>;
  canPublish: boolean;
  fixHref: string;
  cancelHref: string;
  fixing: boolean;
}) {
  const fields = (
    <>
      <input type="hidden" name="poster" value={id} />
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </>
  );
  const small = "px-4 py-2 text-base";
  const listed = duplicates.filter((d) => d.kind === "event");
  const sure = listed.find((d) => d.verdict === "same");
  // Look-alikes listed, but none surely the same: the reviewer says which.
  const maybeOnly = listed.length > 0 && !sure;
  return (
    <li
      id={`item-${id}`}
      className="border-line bg-surface shadow-card flex scroll-mt-24 flex-col gap-3 rounded-2xl border p-5"
    >
      {header}
      <PosterDetails poster={poster} />
      {duplicates.length > 0 && (
        <Likeness
          mandirSlug={mandirSlug}
          duplicates={duplicates}
          canPublish={canPublish}
          action={action}
          fields={fields}
        />
      )}
      {fixing ? (
        <form
          action={action}
          className="border-line flex flex-col gap-5 border-t pt-4"
        >
          <h3 className="text-lg font-bold">Fix the details</h3>
          {fields}
          <EventFields gujarati kinds values={poster} />
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              name="decision"
              value={canPublish ? "edit-publish" : "edit"}
              className={`${buttonClass} ${small}`}
            >
              {canPublish ? "Save and publish" : "Save for the committee"}
            </button>
            <Link href={cancelHref} className="text-peacock underline">
              Cancel
            </Link>
          </div>
        </form>
      ) : (
        <>
          <form action={action} className="flex flex-wrap gap-2">
            {fields}
            {canPublish && (!maybeOnly || sure) && (
              <button
                type="submit"
                name="decision"
                value="publish"
                className={`${buttonClass} ${small}`}
              >
                {sure ? "Add what's new to it" : "Publish"}
              </button>
            )}
            <button
              type="submit"
              name="decision"
              value="discard"
              className={`${quietButtonClass} ${small}`}
            >
              Discard
            </button>
          </form>
          <Link
            href={fixHref}
            className="text-peacock self-start font-semibold underline"
          >
            Fix something first
          </Link>
        </>
      )}
    </li>
  );
}

const clock = (time: string) => `, ${clockLabel(time)}`;

// What's already listed (or waiting) that this may be a copy of. A sure
// copy is never published twice: publishing adds anything new to the one
// listed. A possible copy waits for the reviewer to say: the same as one
// of these, or a different event.
function Likeness({
  mandirSlug,
  duplicates,
  canPublish,
  action,
  fields,
}: {
  mandirSlug: string;
  duplicates: Duplicate[];
  canPublish: boolean;
  action: (formData: FormData) => Promise<void>;
  fields: ReactNode;
}) {
  const listed = duplicates.filter((d) => d.kind === "event");
  const waiting = duplicates.filter((d) => d.kind === "queue");
  const sure = listed.find((d) => d.verdict === "same");
  const small = "px-4 py-2 text-base";
  const link = (d: Duplicate) => (
    <>
      <Link
        href={`/mandirs/${mandirSlug}/events/${d.id}`}
        className="text-peacock font-semibold underline"
      >
        {d.title}
      </Link>
      {clock(d.time)}
      {d.cancelled && " (cancelled)"}
    </>
  );
  return (
    <div
      role="note"
      className="border-marigold bg-marigold/10 flex flex-col gap-2 rounded-xl border-l-4 px-4 py-3"
    >
      {sure ? (
        <>
          <p className="font-semibold">Already on the page</p>
          <p>
            {link(sure)} is the same event.{" "}
            {sure.cancelled
              ? "The mandir has cancelled it: discard this, or restore that event if it's on again."
              : "Nothing is listed twice: publishing adds anything new from this one to it."}
          </p>
        </>
      ) : listed.length > 0 ? (
        <>
          <p className="font-semibold">This may already be on the page</p>
          <ul className="flex flex-col gap-2">
            {listed.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span>{link(d)}</span>
                {canPublish && (
                  <form action={action}>
                    {fields}
                    <input type="hidden" name="same" value={d.id} />
                    <button
                      type="submit"
                      name="decision"
                      value="same"
                      className={`${quietButtonClass} ${small}`}
                    >
                      Same event: add what&apos;s new to it
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          {canPublish && (
            <form action={action} className="flex flex-wrap items-center gap-2">
              {fields}
              <span className="text-muted text-base">Not the same?</span>
              <button
                type="submit"
                name="decision"
                value="different"
                className={`${quietButtonClass} ${small}`}
              >
                Publish as a different event
              </button>
            </form>
          )}
        </>
      ) : null}
      {waiting.length > 0 && (
        <p className="text-base">
          Also waiting:{" "}
          {waiting.map((d, i) => (
            <span key={d.id}>
              {i > 0 && "; "}&ldquo;{d.title}&rdquo;{clock(d.time)}
            </span>
          ))}
          . Publish one, and the others are then checked against it.
        </p>
      )}
    </div>
  );
}
