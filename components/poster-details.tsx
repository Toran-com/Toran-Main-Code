import { Badge } from "@/components/public-shell";
import { checkEvent, EVENT_ERRORS } from "@/lib/event-form";
import { kindLabel } from "@/lib/event-kinds";
import { formatEventStart } from "@/lib/format";
import { POSTER_SOURCES, type Poster } from "@/lib/posters";
import { describeRule } from "@/lib/recurrence";

// What a forwarded poster says, as it would appear once published.
export function PosterDetails({ poster }: { poster: Poster }) {
  const checked = checkEvent(poster);
  return (
    <div className="flex flex-col gap-1">
      <p className="text-marigold-ink font-semibold">
        {checked.ok ? (
          <>
            {checked.event.rule && `${describeRule(checked.event.rule)} · `}
            {formatEventStart(
              checked.event.startsAt.toISOString(),
              checked.event.allDay,
            )}
          </>
        ) : (
          `${poster.date} ${poster.time}`
        )}
      </p>
      <p className="text-xl font-bold">{poster.title}</p>
      {poster.title_gu && (
        <p lang="gu" className="text-lg font-semibold">
          {poster.title_gu}
        </p>
      )}
      {poster.summary && <p>{poster.summary}</p>}
      {poster.summary_gu && <p lang="gu">{poster.summary_gu}</p>}
      {poster.link && (
        <a
          href={poster.link}
          rel="noopener noreferrer"
          className="text-peacock self-start underline"
        >
          {poster.link}
        </a>
      )}
      <p className="text-muted text-base">
        From: {POSTER_SOURCES[poster.from].label}
        {poster.kind &&
          kindLabel(poster.kind) &&
          ` · ${kindLabel(poster.kind)}`}
      </p>
      {poster.read === "machine" && (
        <p>
          <Badge tone="marigold">
            Read from a picture by machine: check every detail
          </Badge>
        </p>
      )}
      {!checked.ok && (
        <p>
          <Badge tone="kumkum">
            Can&apos;t publish: {EVENT_ERRORS[checked.error]}
          </Badge>
        </p>
      )}
    </div>
  );
}
