import { enEventsMap } from "@/lib/i18n/client/events-map";
import { enMandirs } from "@/lib/i18n/client/mandirs";
import { enPlace } from "@/lib/i18n/client/place";
import { enReport } from "@/lib/i18n/client/report";
import { enSeva } from "@/lib/i18n/client/seva";
import { enShare } from "@/lib/i18n/client/share";
import { enSlots } from "@/lib/i18n/client/slots";

// The text that components in the browser show, in English, split by
// feature (lib/i18n/client/) so each page only downloads the lines its
// own components need. Part of en.ts too, so /ops/translations lists them
// with everything else; the Gujarati is in client-messages-gu.ts and only
// comes with Gujarati pages.
export const enClient = {
  ...enShare,
  ...enMandirs,
  ...enSlots,
  ...enSeva,
  ...enReport,
  ...enPlace,
  ...enEventsMap,
} as const;

export type ClientKey = keyof typeof enClient;
