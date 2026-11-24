// The languages an event can be held in (decision 0027), as ISO 639-1
// codes: the same list as the database's check on events.languages. In
// the order families most often look for them in UK mandirs.
export const EVENT_LANGUAGES = [
  "en",
  "gu",
  "hi",
  "ta",
  "pa",
  "te",
  "bn",
  "mr",
  "kn",
  "ml",
  "sa",
] as const;

export type EventLanguage = (typeof EVENT_LANGUAGES)[number];

export const MAX_EVENT_LANGUAGES = 4;

export function isEventLanguage(code: string): code is EventLanguage {
  return (EVENT_LANGUAGES as readonly string[]).includes(code);
}

// Each language's name in itself, so a family recognises their own
// whichever language the page is in.
export const LANGUAGE_NAMES: Record<EventLanguage, string> = {
  en: "English",
  gu: "ગુજરાતી",
  hi: "हिन्दी",
  ta: "தமிழ்",
  pa: "ਪੰਜਾਬੀ",
  te: "తెలుగు",
  bn: "বাংলা",
  mr: "मराठी",
  kn: "ಕನ್ನಡ",
  ml: "മലയാളം",
  sa: "संस्कृतम्",
};

// And in English, after the name in itself where they differ:
// "ગુજરાતી (Gujarati)".
export const LANGUAGE_ENGLISH: Record<EventLanguage, string> = {
  en: "English",
  gu: "Gujarati",
  hi: "Hindi",
  ta: "Tamil",
  pa: "Punjabi",
  te: "Telugu",
  bn: "Bengali",
  mr: "Marathi",
  kn: "Kannada",
  ml: "Malayalam",
  sa: "Sanskrit",
};

export function languageLabel(code: EventLanguage): string {
  return code === "en"
    ? "English"
    : `${LANGUAGE_NAMES[code]} (${LANGUAGE_ENGLISH[code]})`;
}
