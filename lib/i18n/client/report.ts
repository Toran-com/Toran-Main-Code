// The "Tell us about an event" form's messages. English; the Gujarati is in
// lib/i18n/client-messages-gu.ts.
export const enReport = {
  "report.thanks":
    "Thank you. We'll check it with the mandir before it goes on the page.",
  "report.another": "Tell us about another",
  "report.error.title": "Please give the event a name (2 to 120 characters).",
  "report.error.summary": "Please keep the description under 280 characters.",
  "report.error.titleGu":
    "Please keep the Gujarati name between 2 and 120 characters.",
  "report.error.summaryGu":
    "Please keep the Gujarati description under 280 characters.",
  "report.error.kind": "Please choose what kind of event it is.",
  "report.error.date":
    "Please choose a date from today onwards, within the next two years.",
  "report.error.time":
    "Please choose a valid start time, or leave it empty for all day.",
  "report.error.repeat": "Please choose how often it repeats.",
  "report.error.until":
    "Please choose an end date after the first date, and within a year of it.",
  "report.error.untilDaily":
    "For an event every day, please choose a last day within a month of the first, as for a festival like Navratri.",
  "report.error.link":
    "Please give a web address starting with http:// or https://, or leave it empty.",
  "report.error.links": "Please include no more than two web addresses.",
  "report.error.slow":
    "You've sent a few already. Please wait a few minutes before sending another.",
  "report.error.busy":
    "Thank you, but there are a lot of events waiting to be checked just now. Please try again in a few days.",
  "report.error.failed": "Something went wrong. Please try again.",
} as const;
