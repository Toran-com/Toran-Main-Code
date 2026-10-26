import { enShared } from "@/lib/i18n/shared-messages";
import { enClient } from "@/lib/i18n/client-messages";

// Every piece of public text that has a translation, in English (the
// source). Keys group text by page. "{name}" marks a value filled in later.
export const en = {
  ...enClient,
  ...enShared,
  "shell.home": "Toran home",
  "shell.whatsOn": "What's on",
  "shell.mandirs": "Mandirs",
  "shell.festivals": "Festivals",
  "shell.forMandirs": "For mandir committees",
  "shell.find": "Find",
  "shell.toran": "Toran",
  "shell.yourData": "Your data",
  "shell.footerLinks": "Pages about Toran",
  "shell.about": "About",
  "shell.contact": "Contact",
  "shell.corrections": "Correct or remove something",
  "shell.privacy": "Privacy",
  "shell.terms": "Terms",
  "shell.accessibility": "Accessibility",
  "page.somethingWrong": "Something wrong here? Tell us",
  "page.privacyNotice": "Privacy notice",
  "shell.footer":
    "Toran is being tested with mandir committees and opens in 2027.",

  "home.tagline": "What's on at mandirs near you",
  "home.findNear": "Find events near me",
  "home.intro": "Events and seva at UK mandirs, all in one place.",
  "home.mandirs": "Browse mandirs",
  "home.comingUp": "Coming up",
  "home.comingUpNear": "Coming up near {place}",
  "home.seeAll": "See everything that's on",
  "home.festivalsSoon": "Festivals coming up",
  "home.allFestivals": "All festival dates",
  "home.committeesCta": "Run a mandir? Put your events on Toran",
  "home.comingSoon": "Coming soon",
  "home.committeesTitle": "How it works for committees",
  "home.committeesHeading": "Your events, where families already look.",
  "home.mandirCount": "{count} mandirs across the UK",
  "home.mandirsIntro": "Find yours to see what's on.",
  "home.regionCount.one": "{count} mandir",
  "home.regionCount.other": "{count} mandirs",
  "home.step1Title": "Send what you already have",
  "home.step2Title": "Check it in a minute",
  "home.step3Title": "Families find it",
  "home.committeesBody":
    "Send the poster you already share. It's free for mandirs.",

  "whatsOn.title": "What's on",
  "whatsOn.intro": "Events at UK mandirs in the next eight weeks.",
  "whatsOn.filter": "Filter",
  "whatsOn.chosen": "Chosen filters",
  "whatsOn.removeFilter": "Remove {filter}",
  "whatsOn.nearExample": "e.g. HA9 or LE4 6AR",
  "whatsOn.region": "Region",
  "whatsOn.anywhere": "Anywhere",
  "whatsOn.type": "Type of event",
  "whatsOn.anyType": "Everything",
  "whatsOn.show": "Show",
  "whatsOn.count.one": "{count} event",
  "whatsOn.count.other": "{count} events",
  "whatsOn.countRegion": " in {region}",
  "whatsOn.nearestFirst": " · nearest first",
  "whatsOn.onDay": " on {day}",
  "whatsOn.everyDay": "See every day",
  "whatsOn.moreOnDay": "See all {count} on {day} →",
  "whatsOn.chooseArea": "Choose your area",
  "whatsOn.allAreas": "All areas",
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
  "mandir.kit": "Share {period}: a picture and a noticeboard sheet →",
  "mandir.calendarTitle": "Get these events in your calendar",
  "mandir.calendarBody":
    "{name}'s events, kept up to date in your phone's calendar.",
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
  "shell.seva": "Seva",
  "sevaList.title": "Seva",
  "sevaList.intro": "Help at a mandir near you. No sign-up, no name needed.",
  "sevaList.description":
    "Mandirs across the UK that need volunteers. Take a seva slot in a tap, no sign-up needed.",
  "sevaList.count.one": "{count} event needs help",
  "sevaList.count.other": "{count} events need help",
  "sevaList.free.one": "{count} place free",
  "sevaList.free.other": "{count} places free",
  "sevaList.none": "No mandir is asking for seva just now. Look again soon.",
  "sevaList.places.one": "place still needed",
  "sevaList.places.other": "places still needed",
  "sevaList.atMandirs.one": "at {count} mandir",
  "sevaList.atMandirs.other": "at {count} mandirs",
  "sevaList.taken.one": "{count} slot taken on Toran so far",
  "sevaList.taken.other": "{count} slots taken on Toran so far",
  "sevaList.postcode": "Or type a postcode",
  "sevaList.howTitle": "How it works",
  "sevaList.how1": "Choose a shift that suits you and press “Take this slot”.",
  "sevaList.how2": "No name needed. Your phone remembers your slots.",
  "sevaList.how3": "Some roles need a DBS check: ask the mandir.",
  "sevaList.committee": "On a mandir committee?",
  "sevaList.committeeLink": "How it works for committees →",
  "home.sevaTitle": "Seva near you",
  "home.sevaLink": "See where help is needed →",
  "seva.help": "Help with seva",
  "seva.takenOf": "{taken} of {needed}",
  "seva.placesTaken": "places taken. No sign-up needed.",
  "seva.take": "Take a seva slot",
  "seva.seeRota": "See the seva rota",

  "festivals.description":
    "Dates of Navratri, Diwali, Holi and other Hindu festivals in the UK.",
  "festivals.intro": "Festival dates for the UK. Check with your mandir too.",
  "festivals.seasons": "Festival seasons at mandirs",
  "festivals.seasonsIntro":
    "Every mandir's events for the big festivals, in one place.",
  "festivals.calendarTitle": "Festival dates in your calendar",
  "festivals.calendarBody": "Kept up to date in your phone's calendar.",
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
  "season.isOn": "{name} is on {dates}",
  "season.otherCalendars": "Check with your mandir.",
  "season.notListed": "Next year's {name} dates aren't listed yet. See all the",
  "season.festivalDates": "festival dates",
  "season.loadDates": "{name} dates",
  "season.none": "No {name} events listed yet.",
  "season.noneNear": "No {name} events listed near there yet.",
  "season.adding":
    "Mandirs are adding their {name} programmes. Check back soon, or find your",
  "season.committee": "On a mandir committee?",
  "season.addProgramme": "Add your programme in a few minutes",
  "season.calendarTitle": "Put {name} events in your calendar",
  "season.calendarBody":
    "Every mandir's {name} events, kept up to date in your phone's calendar.",
  "season.tellFamily": "Tell family and friends",
  "season.share": "Share the {name} page",
  "season.allOf": "All of {period} at mandirs, in one place",
  "season.diwali.period": "Diwali week",
  "season.diwali.title": "Diwali at UK mandirs",
  "season.diwali.description":
    "Diwali week at Hindu mandirs across the UK: Dhanteras, Lakshmi puja, Annakut and New Year, and Bhai Dooj. Find what's on near you.",
  "season.diwali.intro":
    "Lakshmi puja, fireworks, Annakut and the New Year at UK mandirs.",
  "season.diwali.shareText":
    "Diwali at mandirs across the UK: what's on near you",
  "season.navratri.period": "Navratri",
  "season.navratri.title": "Navratri at UK mandirs",
  "season.navratri.description":
    "Navratri at Hindu mandirs across the UK: nine nights of Garba and Raas, Dussehra and Sharad Purnima. Find what's on near you.",
  "season.navratri.intro":
    "Nine nights of Garba and Raas, then Dussehra and Sharad Purnima, at UK mandirs.",
  "season.navratri.shareText":
    "Navratri Garba at mandirs across the UK: what's on near you",
  "season.maha-shivaratri.period": "Maha Shivaratri",
  "season.maha-shivaratri.title": "Maha Shivaratri at UK mandirs",
  "season.maha-shivaratri.description":
    "Maha Shivaratri at Hindu mandirs across the UK: abhishek, bhajans and all-night worship of Shiva. Find what's on near you.",
  "season.maha-shivaratri.intro":
    "Abhishek, bhajans and the all-night jagran at UK mandirs.",
  "season.maha-shivaratri.shareText":
    "Maha Shivaratri at mandirs across the UK: what's on near you",
  "season.holi.period": "Holi",
  "season.holi.title": "Holi at UK mandirs",
  "season.holi.description":
    "Holi at Hindu mandirs across the UK: the Holika Dahan bonfire and the festival of colours. Find what's on near you.",
  "season.holi.intro":
    "The Holika Dahan bonfire, then a day of colours, at UK mandirs.",
  "season.holi.shareText": "Holi at mandirs across the UK: what's on near you",
  "season.ram-navami.period": "Ram Navami",
  "season.ram-navami.title": "Ram Navami at UK mandirs",
  "season.ram-navami.description":
    "Ram Navami and Hanuman Jayanti at Hindu mandirs across the UK: the birth of Shri Ram, with puja, katha and bhajans. Find what's on near you.",
  "season.ram-navami.intro":
    "The birth of Shri Ram, and Hanuman Jayanti, at UK mandirs.",
  "season.ram-navami.shareText":
    "Ram Navami at mandirs across the UK: what's on near you",
  "season.janmashtami.period": "Janmashtami",
  "season.janmashtami.title": "Janmashtami at UK mandirs",
  "season.janmashtami.description":
    "Janmashtami at Hindu mandirs across the UK: the birth of Shri Krishna, with bhajans, the midnight aarti and the cradle. Find what's on near you.",
  "season.janmashtami.intro":
    "Bhajans, the cradle and the midnight aarti at UK mandirs.",
  "season.janmashtami.shareText":
    "Janmashtami at mandirs across the UK: what's on near you",
  "season.ganesh-chaturthi.period": "Ganesh Chaturthi",
  "season.ganesh-chaturthi.title": "Ganesh Chaturthi at UK mandirs",
  "season.ganesh-chaturthi.description":
    "Ganesh Chaturthi at Hindu mandirs across the UK: Ganesh puja, aarti and visarjan. Find what's on near you.",
  "season.ganesh-chaturthi.intro":
    "Ganesh puja, modak and visarjan at UK mandirs.",
  "season.ganesh-chaturthi.shareText":
    "Ganesh Chaturthi at mandirs across the UK: what's on near you",

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
