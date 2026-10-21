// "Correct or remove something" (/corrections): the kinds of request and
// the checks on what's sent, shared by the form and its server action.
// The database checks the same again (request_correction).

export const CORRECTION_KINDS = [
  { value: "wrong", label: "Something is wrong or out of date" },
  {
    value: "remove_mandir",
    label: "Hide a mandir's page (for its committee)",
  },
  { value: "personal", label: "Remove someone's personal details" },
  {
    value: "other",
    label: "Something else, such as a page that's hard to use",
  },
] as const;

export type CorrectionKind = (typeof CORRECTION_KINDS)[number]["value"];

export const DETAILS_MAX = 1000;

// The page a request is about, as a path on this site. Anything else
// (another site, nonsense) becomes the home page. Browsers read "//x" and
// "/\x" as another site, so neither is a path here.
export function correctionPage(value: unknown): string {
  const page = String(value ?? "").trim();
  return /^\/\S{0,199}$/.test(page) &&
    !page.startsWith("//") &&
    !page.includes("\\")
    ? page
    : "/";
}

export type CorrectionCheck =
  | { ok: true; kind: CorrectionKind; page: string; details: string }
  | { ok: false; error: "kind" | "details" };

export function checkCorrection(form: {
  kind: unknown;
  page: unknown;
  details: unknown;
}): CorrectionCheck {
  const kind = CORRECTION_KINDS.find((k) => k.value === form.kind)?.value;
  if (!kind) return { ok: false, error: "kind" };
  const details = String(form.details ?? "").trim();
  if (details.length < 2 || details.length > DETAILS_MAX) {
    return { ok: false, error: "details" };
  }
  return { ok: true, kind, page: correctionPage(form.page), details };
}
