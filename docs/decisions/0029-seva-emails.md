# 0029. Tell committees about seva places by email: each evening, and when a seva fills

Date: 2026-11-25
Status: Proposed

## Context

Volunteers take seva places on Toran without giving a name (decision
0013), and committees only see the counts when they log in. Milan asked
for committees to be emailed when people sign up for seva. An email for
every place would mean dozens a day at Navratri or Diwali.

## Decision

Each committee member gets two seva emails, while committee emails are on
(`COMMITTEE_EMAIL`, decision 0023):

- **An evening roundup**, sent by a daily job early each evening: the
  places taken on Toran since the last roundup (or the last day), one email
  for the whole mandir, with how each seva's times now stand and a button
  to ask for more people on WhatsApp.
- **"Seva full"**, straight away when every place still to come in a seva
  is taken. It's sent once; adding places (or a new time) lets it be sent
  again when they fill.

Each email has a signed link that stops the seva emails for that member
and mandir, separately from the monthly email. Toran keeps up to when each
mandir's roundup counted and when each seva was said to be full: no
personal data. The emails only count: nobody who takes a place is named.

## Consequences

- Committees know how seva is going without logging in, and when to stop
  asking.
- One roundup a day, however busy, so festivals don't flood inboxes.
- A place given back after its roundup isn't "un-counted" by email; the
  seva page is always right.
- Vercel runs the roundup within the hour after 17:40 UTC (about 6pm in
  winter, 7pm in summer).
