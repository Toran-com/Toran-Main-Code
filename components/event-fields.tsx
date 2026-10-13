import { inputClass } from "@/components/ui";
import { londonDate } from "@/lib/format";

// The details of an event: used by a committee adding an event and by
// Toran typing up a forwarded poster.
export function EventFields() {
  return (
    <>
      <label className="flex flex-col gap-2">
        <span className="font-semibold">What&apos;s happening?</span>
        <input
          name="title"
          required
          minLength={2}
          maxLength={120}
          placeholder="e.g. Diwali celebrations"
          className={inputClass}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-2">
          <span className="font-semibold">Date</span>
          <input
            name="date"
            type="date"
            required
            min={londonDate()}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-semibold">Starts</span>
          <input name="time" type="time" className={inputClass} />
        </label>
      </div>
      <p className="text-muted -mt-3 text-base">
        Leave the start time empty for an all-day event.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="font-semibold">Repeats</span>
          <select name="repeat" defaultValue="none" className={inputClass}>
            <option value="none">Doesn&apos;t repeat</option>
            <option value="weekly">Every week</option>
            <option value="fortnightly">Every other week</option>
            <option value="monthly">Once a month (e.g. 2nd Saturday)</option>
            <option value="monthly-last">
              Once a month, the last one (e.g. last Friday)
            </option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-semibold">Repeats until</span>
          <input name="until" type="date" className={inputClass} />
        </label>
      </div>
      <p className="text-muted -mt-3 text-base">
        For repeating events, leave &ldquo;until&rdquo; empty for six months. Up
        to a year.
      </p>
      <details className="flex flex-col gap-2">
        <summary className="cursor-pointer font-semibold">
          Add a short description (optional)
        </summary>
        <textarea
          name="summary"
          maxLength={280}
          rows={3}
          aria-label="Short description"
          placeholder="e.g. Garba from 8pm, prasad after aarti. All welcome."
          className={`${inputClass} mt-2`}
        />
      </details>
    </>
  );
}
