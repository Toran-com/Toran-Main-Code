import type { ReactNode } from "react";
import { CALENDARS, REGIONS } from "@/lib/mandir-form";
import { inputClass } from "@/components/ui";

const CALENDAR_NAMES: Record<(typeof CALENDARS)[number], string> = {
  gujarati: "Gujarati",
  north_indian: "North Indian",
  tamil: "Tamil",
  bengali: "Bengali",
  other: "Other",
};

type Values = {
  name?: string;
  town?: string;
  region?: string;
  postcode?: string | null;
  website?: string | null;
  phone?: string | null;
  tradition?: string | null;
  calendar?: string | null;
  charity_number?: string | null;
  getting_there?: string | null;
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-semibold">{label}</span>
      {hint && <span className="text-muted -mt-1 text-base">{hint}</span>}
      {children}
    </label>
  );
}

// The mandir details fields, shared by "add a mandir" and "edit".
export function MandirFields({ values = {} }: { values?: Values }) {
  return (
    <>
      <Field label="Name">
        <input
          name="name"
          required
          minLength={2}
          maxLength={160}
          defaultValue={values.name}
          className={inputClass}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Town">
          <input
            name="town"
            required
            minLength={2}
            maxLength={80}
            defaultValue={values.town}
            className={inputClass}
          />
        </Field>
        <Field label="Region">
          <select
            name="region"
            required
            defaultValue={values.region ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              Choose…
            </option>
            {REGIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Postcode">
          <input
            name="postcode"
            autoComplete="off"
            defaultValue={values.postcode ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Public phone" hint="The mandir's own number only">
          <input
            name="phone"
            type="tel"
            defaultValue={values.phone ?? ""}
            className={inputClass}
          />
        </Field>
      </div>
      <Field label="Website">
        <input
          name="website"
          inputMode="url"
          defaultValue={values.website ?? ""}
          className={inputClass}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tradition" hint="e.g. Swaminarayan (BAPS)">
          <input
            name="tradition"
            maxLength={120}
            defaultValue={values.tradition ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Festival calendar">
          <select
            name="calendar"
            defaultValue={values.calendar ?? ""}
            className={inputClass}
          >
            <option value="">Not known</option>
            {CALENDARS.map((c) => (
              <option key={c} value={c}>
                {CALENDAR_NAMES[c]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Charity number">
        <input
          name="charity_number"
          maxLength={20}
          defaultValue={values.charity_number ?? ""}
          className={inputClass}
        />
      </Field>
      <Field
        label="Getting there"
        hint="Parking, entrance, nearest station or bus. No personal numbers."
      >
        <textarea
          name="getting_there"
          rows={3}
          maxLength={400}
          defaultValue={values.getting_there ?? ""}
          className={inputClass}
        />
      </Field>
    </>
  );
}
