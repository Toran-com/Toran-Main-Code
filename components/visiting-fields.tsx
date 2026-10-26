import { inputClass } from "@/components/ui";
import {
  FACILITY_GROUPS,
  FACILITY_LABELS,
  VISITING_NOTE_MAX,
} from "@/lib/visiting";

const GROUP_TITLES: Record<keyof typeof FACILITY_GROUPS, string> = {
  access: "Getting in and around",
  food: "Food",
};

// "Visiting": ticks for what the mandir has, and a note for anything
// else. Shared by the committee's details form and Toran's mandir forms.
export function VisitingFields({
  facilities = [],
  note,
}: {
  facilities?: readonly string[];
  note?: string | null;
}) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="font-semibold">Visiting</legend>
      <p className="text-muted text-base">
        Tick what the mandir has, so older visitors, wheelchair users and
        families know before they set off.
      </p>
      {(Object.keys(FACILITY_GROUPS) as (keyof typeof FACILITY_GROUPS)[]).map(
        (group) => (
          <fieldset key={group} className="flex flex-col gap-2">
            <legend className="text-muted text-base font-semibold">
              {GROUP_TITLES[group]}
            </legend>
            <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {FACILITY_GROUPS[group].map((facility) => (
                <label key={facility} className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="facilities"
                    value={facility}
                    defaultChecked={facilities.includes(facility)}
                    className="accent-peacock mt-1 size-5 shrink-0"
                  />
                  <span>{FACILITY_LABELS[facility]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ),
      )}
      <label className="flex flex-col gap-2">
        <span className="font-semibold">
          Anything else visitors should know
        </span>
        <span className="text-muted -mt-1 text-base">
          For example what to wear, where to leave shoes, or whether photos are
          allowed. No personal numbers.
        </span>
        <textarea
          name="visiting_note"
          rows={3}
          maxLength={VISITING_NOTE_MAX}
          defaultValue={note ?? ""}
          className={inputClass}
        />
      </label>
    </fieldset>
  );
}
