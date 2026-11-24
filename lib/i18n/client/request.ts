// The messages after asking a mandir about a puja or a booking. English;
// the Gujarati and Hindi are in lib/i18n/client-messages-gu.ts and -hi.ts.
export const enRequest = {
  "request.sent": "Sent. The committee will reply to you directly.",
  "request.error.what": "Please choose what you'd like to ask about.",
  "request.error.date":
    "Please choose a date from today on, or leave it empty.",
  "request.error.name": "Please give your name.",
  "request.error.email": "That email address doesn't look right.",
  "request.error.phone":
    "Please use only numbers, spaces and + ( ) in the phone number.",
  "request.error.contact":
    "Please give an email or a phone number, so they can reply.",
  "request.error.message": "Please keep the message under 600 characters.",
  "request.error.slow":
    "You've sent a few requests just now. Please wait ten minutes.",
  "request.error.failed":
    "That couldn't be sent just now. Please try again, or call the mandir.",
} as const;
