import { Badge } from "@/components/public-shell";
import { checkEvent, EVENT_ERRORS } from "@/lib/event-form";
import { kindLabel } from "@/lib/event-kinds";
import { formatEventStart } from "@/lib/format";
import { POSTER_SOURCES, type Poster } from "@/lib/posters";
import { describeRule } from "@/lib/recurrence";

function siteName(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
}

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
      {/* Just the website's name, so a long address can't run off a
          phone's screen. */}
      {poster.link && (
        <a
          href={poster.link}
          rel="noopener noreferrer"
          className="text-peacock max-w-full self-start font-semibold break-all underline"
        >
          More details on {siteName(poster.link)}
          <span aria-hidden="true"> ↗</span>
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
          <Badge tone="marigold">Read by machine: check every detail</Badge>
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
