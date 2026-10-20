import Link from "next/link";
import type { ReactNode } from "react";
import { EventFields } from "@/components/event-fields";
import { PosterDetails } from "@/components/poster-details";
import { buttonClass, quietButtonClass } from "@/components/ui";
import type { Poster } from "@/lib/posters";
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
  return (
    <li
      id={`item-${id}`}
      className="border-line bg-surface shadow-card flex scroll-mt-24 flex-col gap-3 rounded-2xl border p-5"
    >
      {header}
      <PosterDetails poster={poster} />
      {duplicates.length > 0 && (
        <div
          role="note"
          className="border-marigold bg-marigold/10 flex flex-col gap-1 rounded-xl border-l-4 px-4 py-3"
        >
          <p className="font-semibold">This may already be on Toran</p>
          <ul className="flex flex-col gap-1">
            {duplicates.map((d) => (
              <li key={d.id}>
                {d.kind === "event" ? (
                  <>
                    On the page:{" "}
                    <Link
                      href={`/mandirs/${mandirSlug}/events/${d.id}`}
                      className="text-peacock underline"
                    >
                      {d.title}
                    </Link>
                  </>
                ) : (
                  <>Also waiting: &ldquo;{d.title}&rdquo;</>
                )}
              </li>
            ))}
          </ul>
          <p className="text-muted text-base">
            If it&apos;s the same event, discard this one.
          </p>
        </div>
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
            {canPublish && (
              <button
                type="submit"
                name="decision"
                value="publish"
                className={`${buttonClass} ${small}`}
              >
                Publish
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
