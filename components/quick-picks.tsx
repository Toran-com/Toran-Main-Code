import { buttonClass, inputClass } from "@/components/ui";
import { formatDateRange, londonDate } from "@/lib/format";
import type { QuickPick } from "@/lib/quick-events";

// Events a committee can add in one go by ticking them: the festivals
// coming up, or last year's events on this year's dates. Each can be
// renamed, moved or given a time before adding. The fields are labelled
// Event, Day and Time so they don't clash with the "Add an event" form.
export function QuickPicks({
  slug,
  picks,
  action,
  button,
}: {
  slug: string;
  picks: QuickPick[];
  action: (formData: FormData) => Promise<void>;
  button: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="slug" value={slug} />
      <ul className="flex flex-col gap-3">
        {picks.map((pick, i) => (
          <li
            key={`${pick.festivalDateId ?? pick.title}-${pick.date}`}
            className="border-line flex flex-col gap-3 rounded-2xl border p-4"
          >
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="pick"
                value={i}
                className="accent-marigold mt-1 size-5 shrink-0"
              />
              <span className="flex flex-col">
                <span className="font-semibold">
                  {pick.title}, {formatDateRange(pick.date, pick.date)}
                </span>
                {pick.note && (
                  <span className="text-muted text-base">{pick.note}</span>
                )}
              </span>
            </label>
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
              <label className="flex flex-col gap-1">
                <span className="text-base font-semibold">
                  Event
                  <span className="sr-only"> for {pick.title}</span>
                </span>
                <input
                  name={`title-${i}`}
                  defaultValue={pick.title}
                  maxLength={120}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-base font-semibold">
                  Day
                  <span className="sr-only"> for {pick.title}</span>
                </span>
                <input
                  name={`date-${i}`}
                  type="date"
                  defaultValue={pick.date}
                  min={londonDate()}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-base font-semibold">
                  Time
                  <span className="sr-only"> for {pick.title}</span>
                </span>
                <input
                  name={`time-${i}`}
                  type="time"
                  defaultValue={pick.time}
                  className={inputClass}
                />
              </label>
            </div>
            <input type="hidden" name={`kind-${i}`} value={pick.kind} />
            <input type="hidden" name={`summary-${i}`} value={pick.summary} />
            <input type="hidden" name={`title_gu-${i}`} value={pick.title_gu} />
            <input
              type="hidden"
              name={`summary_gu-${i}`}
              value={pick.summary_gu}
            />
            <input
              type="hidden"
              name={`festival-${i}`}
              value={pick.festivalDateId ?? ""}
            />
          </li>
        ))}
      </ul>
      <p className="text-muted text-base">
        Leave the time empty for all day. You can add a description or the
        Gujarati afterwards with &ldquo;Edit&rdquo;.
      </p>
      <button type="submit" className={buttonClass}>
        {button}
      </button>
    </form>
  );
}
