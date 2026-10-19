import { enClient } from "@/lib/i18n/client-messages";

// Every piece of public text that has a translation, in English (the
// source). Keys group text by page. "{name}" marks a value filled in later.
export const en = {
  ...enClient,
  "shell.home": "Toran home",
  "shell.whatsOn": "What's on",
  "shell.mandirs": "Mandirs",
  "shell.festivals": "Festivals",
  "shell.forMandirs": "For mandir committees",
  "shell.footer":
    "Toran is being tested with mandir committees and opens in 2027. Details come from mandirs' own websites and our research; if something is wrong, the mandir's committee can correct it.",

  "home.tagline": "What's on at mandirs near you",
  "home.intro":
    "Events from mandirs across the UK in one place, and a simple way for committees to organise seva. We are talking to mandir committees now and will open in 2027.",
  "home.mandirs": "Browse mandirs",
  "home.searchTitle": "Find what's on near you",
  "home.comingUp": "Coming up",
  "home.seeAll": "See everything that's on",
  "home.festivalsSoon": "Festivals coming up",
  "home.allFestivals": "All festival dates",
  "home.committeesCta": "Run a mandir? Put your events on Toran",
  "home.comingSoon": "Coming soon",
  "home.committeesTitle": "How it works for committees",
  "home.committeesBody":
    "Committees send the patrika or poster they already share, and check it before it goes live. It's free for mandirs.",

  "whatsOn.title": "What's on",
  "whatsOn.intro":
    "Events at mandirs across the UK in the next eight weeks. Type your postcode, or press \u201cNear me\u201d, to see what's near you.",
  "whatsOn.near": "Your postcode or area",
  "whatsOn.nearExample": "e.g. HA9 or LE4 6AR",
  "whatsOn.within": "Within",
  "whatsOn.miles": "{miles} miles",
  "whatsOn.region": "Region",
  "whatsOn.anywhere": "Anywhere",
  "whatsOn.type": "Type of event",
  "whatsOn.anyType": "Everything",
  "whatsOn.moreOptions": "Choose a region",
  "whatsOn.show": "Show",
  "whatsOn.count.one": "{count} event",
  "whatsOn.count.other": "{count} events",
  "whatsOn.countNear": " within {miles} miles of {place}",
  "whatsOn.countRegion": " in {region}",
  "whatsOn.countType": " ({type})",
  "whatsOn.nearestFirst": ", nearest first each day",
  "whatsOn.locationDenied":
    "Your browser didn't share your location. Type your postcode instead.",
  "whatsOn.locationFailed":
    "We couldn't find your area just now. Type your postcode instead.",
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

  "load.notConnected":
    "The {what} isn't connected yet. Please check back soon.",
  "load.failed":
    "We couldn't load the {what} just now. Please try again in a minute.",
  "calendar.add": "Add to calendar",
  "calendar.addLabel": "Add to calendar: {title}",
  "calendar.file": "Apple, Outlook or another calendar",
  "whatsOn.description":
    "Events at Hindu mandirs across the UK in the next eight weeks: festivals, aarti, bhajans, classes and more.",
  "load.eventList": "event list",
  "mandirs.description": "Hindu mandirs across the UK, by region and town.",
  "mandirs.intro": "Hindu mandirs across the UK. Find yours to see what's on.",
  "mandirs.none": "No mandirs are listed yet.",
  "load.mandirList": "mandir list",

  "mandir.description":
    "What's on at {name} in {town}: events, festivals and how to find it.",
  "load.mandirPage": "mandir's page",
  "mandir.all": "← All mandirs",
  "mandir.runByCommittee": "Run by the mandir's committee",
  "mandir.tellUs": "Know about an event here? Tell us →",
  "mandir.festivalDates": "Festival dates for the UK →",
  "mandir.print": "Print for a noticeboard →",
  "mandir.calendarTitle": "Get these events in your calendar",
  "mandir.calendarBody":
    "Add {name}'s events to the calendar on your phone. New events and changes appear there automatically.",
  "mandir.committeeTitle": "Are you on this mandir's committee?",
  "mandir.claimedBefore": "This page is looked after by the committee.",
  "mandir.logIn": "Log in",
  "mandir.claimedAfter": "to update it, or ask to join them.",
  "mandir.lookAfterBody":
    "Look after this page: add events in a minute and correct any details.",
  "mandir.lookAfter": "Look after this page",
  "mandir.tradition": "Tradition",
  "mandir.postcode": "Postcode",
  "mandir.directions": "Directions",
  "mandir.website": "Website",
  "mandir.phone": "Phone",
  "mandir.call": "Call",
  "mandir.charity": "Registered charity",
  "mandir.about": "About the mandir",
  "mandir.share": "Share this mandir",
  "mandir.shareText": "{name}, {town}: what's on",
  "mandir.confirmedOn": "Confirmed by the mandir, {date}",
  "event.repeatNext": "{rule} · next ",
  "event.moreDetails": "More details",
  "mandir.asking": "We're asking mandirs to add their events.",
  "mandir.untilThenCheck": "Until then, check",
  "mandir.orNoticeboard": "or the mandir's noticeboard.",
  "mandir.untilThenNoticeboard": "Until then, check the mandir's noticeboard.",

  "event.repeats": "Repeats",
  "event.whenAt": "{when} at {name}, {town}.",
  "load.event": "event",
  "event.finished": "Finished",
  "event.finishedNote": "This event has finished.",
  "event.seeWhatsOnAt": "See what's on at {name}",
  "event.cancelledNote": "The mandir has cancelled this event.",
  "event.seeElseAt": "See what else is on at {name}",
  "event.about": "About this event",
  "event.alsoAt": "Also at {name}",
  "event.everythingAt": "Everything at {name} →",
  "event.whatsOnNear": "What's on near you →",
  "event.when": "When",
  "event.next": "Next: {when}",
  "event.where": "Where",
  "event.cost": "Cost",
  "event.fromMandir": "From the mandir",
  "seva.help": "Help with seva",
  "seva.takenOf": "{taken} of {needed}",
  "seva.placesTaken":
    "places taken. Take a slot in a tap: no sign-up, and no name needed.",
  "seva.take": "Take a seva slot",
  "seva.seeRota": "See the seva rota",

  "festivals.description":
    "Dates of Navratri, Diwali, Holi and other Hindu festivals in the UK.",
  "festivals.intro":
    "Dates for the UK. A few festivals fall on different days depending on the calendar a mandir follows, so check with your mandir too.",
  "festivals.calendarTitle": "Festival dates in your calendar",
  "festivals.calendarBody":
    "Add the festival dates to the calendar on your phone. Dates we check or add later appear there automatically.",
  "festivals.none": "No festival dates are listed yet.",
  "load.festivalDates": "festival dates",
  "load.festivalPage": "festival page",
  "festival.title": "{name} in the UK",
  "festival.titleYear": "{name} {year} in the UK",
  "festival.description":
    "{name} dates for the UK and events at mandirs near you.",
  "festival.share": "Share this festival",
  "festival.shareText": "{name} in the UK: dates and events at mandirs",
  "festival.appearBefore": "They appear here as mandirs add them. Check",
  "festival.whatsOnLink": "what's on",
  "festival.orFind": "or find your",
  "festival.nearestMandir": "nearest mandir",
  "festival.appearAfter": ".",
  "festival.name.navratri": "Navratri",
  "festival.summary.navratri":
    "Nine nights of Garba and Raas, worshipping the Goddess in her nine forms.",
  "festival.name.dussehra": "Dussehra",
  "festival.summary.dussehra":
    "Vijayadashami: the victory of good over evil, the day after Navratri ends.",
  "festival.name.dhanteras": "Dhanteras",
  "festival.summary.dhanteras":
    "The first day of Diwali, for Lakshmi puja and new beginnings.",
  "festival.name.diwali": "Diwali",
  "festival.summary.diwali": "The festival of lights.",
  "festival.name.annakut": "Annakut and New Year",
  "festival.summary.annakut":
    "The Gujarati New Year (Bestu Varas), with a mountain of food offered at the mandir.",
  "festival.name.bhai-dooj": "Bhai Dooj",
  "festival.summary.bhai-dooj": "Brothers and sisters, two days after Diwali.",
  "festival.name.maha-shivaratri": "Maha Shivaratri",
  "festival.summary.maha-shivaratri":
    "The great night of Shiva, with all-night worship.",
  "festival.name.holi": "Holi",
  "festival.summary.holi":
    "The festival of colours, after Holika Dahan the night before.",
  "festival.name.sharad-purnima": "Sharad Purnima",
  "festival.summary.sharad-purnima":
    "The full moon after Navratri: Raas Garba under the moon, and doodh pauva.",
  "festival.name.labh-pancham": "Labh Pancham",
  "festival.summary.labh-pancham":
    "The fifth day of the Gujarati New Year, for new beginnings in work and business.",
  "festival.name.dev-diwali": "Dev Diwali",
  "festival.summary.dev-diwali":
    "Kartik Purnima, the full moon after Diwali, when lamps are lit for the gods.",
  "festival.name.uttarayan": "Uttarayan (Makar Sankranti)",
  "festival.summary.uttarayan":
    "The sun turns north: kites, til and gol, and khichdi.",
  "festival.name.vasant-panchami": "Vasant Panchami",
  "festival.summary.vasant-panchami":
    "The first day of spring, with Saraswati puja.",
  "festival.name.holika-dahan": "Holika Dahan",
  "festival.summary.holika-dahan": "The bonfire on the night before Holi.",
  "festival.name.ram-navami": "Ram Navami",
  "festival.summary.ram-navami": "The birth of Shri Ram.",
  "festival.name.hanuman-jayanti": "Hanuman Jayanti",
  "festival.summary.hanuman-jayanti": "The birth of Hanumanji.",
  "festival.name.guru-purnima": "Guru Purnima",
  "festival.summary.guru-purnima": "The full moon for honouring your guru.",
  "festival.name.raksha-bandhan": "Raksha Bandhan",
  "festival.summary.raksha-bandhan":
    "Sisters tie a rakhi on their brothers' wrists.",
  "festival.name.janmashtami": "Janmashtami",
  "festival.summary.janmashtami":
    "The birth of Shri Krishna, celebrated at midnight.",
  "festival.name.ganesh-chaturthi": "Ganesh Chaturthi",
  "festival.summary.ganesh-chaturthi":
    "The birth of Ganeshji, with puja and visarjan.",

  "seva.pageTitle": "Seva for {title}, {name}",
  "seva.pageDescription":
    "Help with seva for {title} at {name}, {town}. Take a slot, no sign-up needed.",
  "load.sevaRota": "seva rota",
  "seva.pickBelow":
    "places taken. Pick a slot below: no sign-up, and Toran doesn't ask your name.",
  "seva.closedNote":
    "Here's what {name} needs. To help, reply in the mandir's volunteers' group or ask at the mandir.",
  "seva.dbsNeeded": "DBS check needed",
  "seva.shiftTaken": "{done} of {needed} taken",
  "seva.askCommittee": "Ask the committee: the mandir checks DBS",
  "seva.share": "Share this rota",
  "seva.shareText":
    "Seva for {title} at {name}: {free} places still free. Take a slot, no sign-up needed:",

  "report.title": "Tell us about an event",
  "report.intro":
    "At {name}, {town}. Seen a poster or a WhatsApp message about something coming up? Tell us, and we'll check it with the mandir before it goes on the page.",
  "report.what": "What's happening?",
  "report.whatExample": "e.g. Diwali celebrations",
  "report.date": "Date",
  "report.starts": "Starts (optional)",
  "report.more": "Anything else people should know? (optional)",
  "report.moreExample": "e.g. Garba from 8pm, prasad after aarti.",
  "report.where": "Where did you see it? (optional)",
  "report.whereHint": "A link to the poster or post, if there is one.",
  "report.privacy":
    "We don't ask who you are, and we don't keep anything about you. Please don't include anyone's phone number or other personal details.",
  "report.send": "Send",
} as const;

export type MessageKey = keyof typeof en;
