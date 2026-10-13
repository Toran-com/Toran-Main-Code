// Checks the mandir details form used by Toran admins (and, for the
// practical details, by committees). Returns tidy values or the first
// problem found, as a short code the page turns into a message.

import { normalisePostcode } from "@/lib/geo";

export const REGIONS = [
  "East Midlands",
  "East of England",
  "London",
  "North East",
  "North West",
  "Northern Ireland",
  "Scotland",
  "South East",
  "South West",
  "Wales",
  "West Midlands",
  "Yorkshire",
] as const;

export const CALENDARS = [
  "gujarati",
  "north_indian",
  "tamil",
  "bengali",
  "other",
] as const;

export type Calendar = (typeof CALENDARS)[number];

export type PracticalDetails = {
  postcode: string | null;
  website: string | null;
  phone: string | null;
};

export type MandirDetails = PracticalDetails & {
  name: string;
  town: string;
  region: string;
  tradition: string | null;
  calendar: Calendar | null;
  charity_number: string | null;
};

type Result<T> = { ok: true; values: T } | { ok: false; error: string };

const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();

export function parsePracticalDetails(
  form: FormData,
): Result<PracticalDetails> {
  const postcodeInput = text(form, "postcode");
  const postcode = postcodeInput ? normalisePostcode(postcodeInput) : null;
  if (postcodeInput && !postcode) return { ok: false, error: "postcode" };

  let website: string | null = text(form, "website") || null;
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  if (website) {
    try {
      const url = new URL(website);
      if (!url.hostname.includes(".")) return { ok: false, error: "website" };
    } catch {
      return { ok: false, error: "website" };
    }
  }

  const phone = text(form, "phone") || null;
  if (phone && !/^[0-9+() -]{6,40}$/.test(phone)) {
    return { ok: false, error: "phone" };
  }
  return { ok: true, values: { postcode, website, phone } };
}

export function parseMandirDetails(form: FormData): Result<MandirDetails> {
  const name = text(form, "name");
  if (name.length < 2 || name.length > 160) return { ok: false, error: "name" };
  const town = text(form, "town");
  if (town.length < 2 || town.length > 80) return { ok: false, error: "town" };
  const region = text(form, "region");
  if (!(REGIONS as readonly string[]).includes(region)) {
    return { ok: false, error: "region" };
  }
  const tradition = text(form, "tradition") || null;
  if (tradition && tradition.length > 120) {
    return { ok: false, error: "tradition" };
  }
  const calendarInput = text(form, "calendar");
  const calendar = (CALENDARS as readonly string[]).includes(calendarInput)
    ? (calendarInput as Calendar)
    : null;
  const charity_number = text(form, "charity_number") || null;
  if (charity_number && !/^[A-Z0-9-]{3,20}$/i.test(charity_number)) {
    return { ok: false, error: "charity_number" };
  }
  const practical = parsePracticalDetails(form);
  if (!practical.ok) return practical;
  return {
    ok: true,
    values: {
      name,
      town,
      region,
      tradition,
      calendar,
      charity_number,
      ...practical.values,
    },
  };
}

export const FORM_ERRORS: Record<string, string> = {
  name: "Please give the mandir's name (2 to 160 characters).",
  town: "Please give the town (2 to 80 characters).",
  region: "Please choose a region.",
  tradition: "Please keep the tradition under 120 characters.",
  charity_number: "That doesn't look like a charity number.",
  postcode: "That doesn't look like a UK postcode.",
  website: "That doesn't look like a website address.",
  phone: "Please use only numbers, spaces and + ( ) in the phone number.",
  failed: "Something went wrong. Please try again.",
};

export function slugFor(name: string, town: string): string {
  const base = name.toLowerCase().includes(town.toLowerCase())
    ? name
    : `${name} ${town}`;
  return base
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .replace(/-$/, "");
}
