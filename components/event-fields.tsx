import { inputClass } from "@/components/ui";
import type { EventInput } from "@/lib/event-form";
import { EVENT_KINDS } from "@/lib/event-kinds";
import { londonDate } from "@/lib/format";

// The details of an event: used by a committee adding or editing an event
// and by Toran typing up a forwarded poster. Committees can also give the
// name and description in Gujarati, say what kind of event it is, and
// give its cost and whether to book first (`tickets`), and where it's
// held if not in the usual hall (`place`). "values" fills the fields in,
// when editing.
export function EventFields({
  gujarati = false,
  kinds = false,
  tickets = false,
  place = false,
  values,
}: {
  gujarati?: boolean;
  kinds?: boolean;
  tickets?: boolean;
  place?: boolean;
  values?: EventInput;
}) {
  return (
    <>
      <label className="flex flex-col gap-2">
        <span className="font-semibold">What&apos;s happening?</span>
        <input
          name="title"
          defaultValue={values?.title}
          required
          minLength={2}
          maxLength={120}
          placeholder="e.g. Diwali celebrations"
          className={inputClass}
        />
      </label>
      {kinds && (
        <label className="flex flex-col gap-2">
          <span className="font-semibold">What kind of event?</span>
          <select
            name="kind"
            defaultValue={values?.kind ?? "other"}
            className={inputClass}
          >
            {Object.entries(EVENT_KINDS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-2">
          <span className="font-semibold">Date</span>
          <input
            name="date"
            type="date"
            defaultValue={values?.date}
            required
            min={londonDate()}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-semibold">Starts</span>
          <input
            name="time"
            type="time"
            defaultValue={values?.time}
            className={inputClass}
          />
        </label>
      </div>
      <p className="text-muted -mt-3 text-base">
        Leave the start time empty for an all-day event.
      </p>
      <details
        className="flex flex-col gap-2"
        open={!!values?.repeat && values.repeat !== "none"}
      >
        <summary className="cursor-pointer font-semibold">
          Happens every day, week or month?
        </summary>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="font-semibold">Repeats</span>
            <select
              name="repeat"
              defaultValue={values?.repeat ?? "none"}
              className={inputClass}
            >
              <option value="none">Doesn&apos;t repeat</option>
              <option value="daily">
                Every day (a festival&apos;s run, like Navratri)
              </option>
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
            <input
              name="until"
              type="date"
              defaultValue={values?.until}
              className={inputClass}
            />
          </label>
        </div>
        <p className="text-muted mt-2 text-base">
          Leave &ldquo;until&rdquo; empty for six months. Up to a year.
        </p>
      </details>
      <details className="flex flex-col gap-2" open={!!values?.summary}>
        <summary className="cursor-pointer font-semibold">
          Add a short description (optional)
        </summary>
        <textarea
          name="summary"
          defaultValue={values?.summary}
          maxLength={280}
          rows={3}
          aria-label="Short description"
          placeholder="e.g. Garba from 8pm, prasad after aarti. All welcome."
          className={`${inputClass} mt-2`}
        />
      </details>
      {place && (
        <details
          className="flex flex-col gap-2"
          open={
            !!(
              values?.location_note ||
              values?.venue_name ||
              values?.venue_postcode
            )
          }
        >
          <summary className="cursor-pointer font-semibold">
            Add a room, or a place away from the mandir (optional)
          </summary>
          <div className="mt-2 flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="font-semibold">Room or hall</span>
              <input
                name="location_note"
                defaultValue={values?.location_note}
                maxLength={160}
                placeholder="e.g. Main hall, enter by the side gate"
                className={inputClass}
              />
            </label>
            <p className="text-muted text-base">
              Held away from the mandir, such as a hired hall or a park? Give
              the place and its postcode, and directions will take people there.
            </p>
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <label className="flex flex-col gap-2">
                <span className="font-semibold">Name of the place</span>
                <input
                  name="venue_name"
                  defaultValue={values?.venue_name}
                  maxLength={120}
                  placeholder="e.g. Harrow Leisure Centre"
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="font-semibold">Its postcode</span>
                <input
                  name="venue_postcode"
                  defaultValue={values?.venue_postcode}
                  maxLength={10}
                  autoCapitalize="characters"
                  className={inputClass}
                />
              </label>
            </div>
          </div>
        </details>
      )}
      {tickets && (
        <details
          className="flex flex-col gap-2"
          open={!!(values?.cost_note || values?.tickets || values?.tickets_url)}
        >
          <summary className="cursor-pointer font-semibold">
            Add the cost or tickets (optional)
          </summary>
          <div className="mt-2 flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="font-semibold">Cost</span>
              <input
                name="cost_note"
                defaultValue={values?.cost_note}
                maxLength={80}
                placeholder="e.g. Free, or £10 adults, children free"
                className={inputClass}
              />
            </label>
            <label className="flex items-center gap-3 font-semibold">
              <input
                type="checkbox"
                name="tickets"
                value="needed"
                defaultChecked={values?.tickets === "needed"}
                className="accent-peacock size-6"
              />
              People need to book or get a ticket first
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-semibold">Where to book (optional)</span>
              <input
                name="tickets_url"
                inputMode="url"
                maxLength={300}
                defaultValue={values?.tickets_url}
                placeholder="https://"
                className={inputClass}
              />
            </label>
            <p className="text-muted text-base">
              Leave the link empty if people book by phone or at the mandir.
            </p>
          </div>
        </details>
      )}
      {gujarati && (
        <details
          className="flex flex-col gap-2"
          open={!!(values?.title_gu || values?.summary_gu)}
        >
          <summary className="cursor-pointer font-semibold">
            Add the name and description in Gujarati (optional)
          </summary>
          <div className="mt-2 flex flex-col gap-3">
            <label className="flex flex-col gap-2">
              <span className="font-semibold">Name in Gujarati</span>
              <input
                name="title_gu"
                defaultValue={values?.title_gu}
                lang="gu"
                minLength={2}
                maxLength={120}
                placeholder="દા.ત. દિવાળી ઉજવણી"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-semibold">Description in Gujarati</span>
              <textarea
                name="summary_gu"
                defaultValue={values?.summary_gu}
                lang="gu"
                maxLength={280}
                rows={3}
                className={inputClass}
              />
            </label>
            <p className="text-muted text-base">
              Shown under the English, for families who read Gujarati.
            </p>
          </div>
        </details>
      )}
    </>
  );
}
