// Every piece of public text that has a translation, in English (the
// source). Keys group text by page. "{name}" marks a value filled in later.
export const en = {
  "shell.home": "Toran home",
  "shell.whatsOn": "What's on",
  "shell.mandirs": "Mandirs",
  "shell.festivals": "Festivals",
  "shell.footer":
    "Toran is being tested with mandir committees and opens in 2027. Details come from mandirs' own websites and our research; if something is wrong, the mandir's committee can correct it.",

  "home.tagline": "What's on at mandirs near you",
  "home.intro":
    "Events from mandirs across the UK in one place, and a simple way for committees to organise seva. We are talking to mandir committees now and will open in 2027.",
  "home.whatsOn": "What's on",
  "home.mandirs": "Browse mandirs",
  "home.festivals": "Festival dates",
  "home.comingSoon": "Coming soon",

  "whatsOn.title": "What's on",
  "whatsOn.intro":
    "Events at mandirs across the UK in the next eight weeks. Type your postcode to see what's near you.",
  "whatsOn.near": "Your postcode or area",
  "whatsOn.nearExample": "e.g. HA9 or LE4 6AR",
  "whatsOn.within": "Within",
  "whatsOn.miles": "{miles} miles",
  "whatsOn.region": "Region",
  "whatsOn.anywhere": "Anywhere",
  "whatsOn.type": "Type of event",
  "whatsOn.anyType": "Any type",
  "whatsOn.show": "Show",
  "whatsOn.count.one": "{count} event",
  "whatsOn.count.other": "{count} events",
  "whatsOn.countNear": " within {miles} miles of {place}",
  "whatsOn.countRegion": " in {region}",
  "whatsOn.countType": " ({type})",
  "whatsOn.lookupFailed":
    "We couldn't look up that postcode just now, so all events are shown.",
  "whatsOn.notFound":
    'We couldn\'t find "{place}". Try a full postcode like LE4 6AR, or just the first part like LE4.',
  "whatsOn.noneThere": "No events listed there in the next eight weeks.",
  "whatsOn.noneYet": "No events listed yet.",
  "whatsOn.emptyBefore":
    "Mandirs are adding their events as they join Toran. In the meantime, find your nearest mandir on the ",
  "whatsOn.emptyLink": "mandir list",
  "whatsOn.emptyAfter": ".",

  "event.cancelled": "Cancelled",

  "festival.all": "← All festivals",
  "festival.dateNotChecked": "Date not yet checked",
  "festival.noDate": "No upcoming date is listed yet.",
  "festival.atMandirs": "{name} at mandirs",
  "festival.noEvents": "No mandir has listed {name} events yet.",
} as const;

export type MessageKey = keyof typeof en;
