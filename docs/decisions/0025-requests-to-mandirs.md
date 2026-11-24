# 0025. Families ask a committee about pujas and bookings by email, not kept

Date: 2026-11-24
Status: Proposed

## Context

Families often need a mandir for something of their own: a puja at home,
a naming ceremony, a havan, or hiring the hall for a birthday. Today they
ring a number that isn't answered, or ask around on WhatsApp. For a
committee, these requests are a reason to keep its Toran page up to date,
and for many mandirs hall hire and pujas are a real part of their income.

Toran keeps as little personal data as it can (decision 0006). A booking
system would hold names, contact details and dates for every family, and
would need the committee to answer inside Toran.

## Decision

A committee lists what families can ask for (up to eight, such as "Havan"
or "Hall hire"). The mandir's page then has an "Ask about a puja or
booking" button and a short form (what, a date, a name, an email or phone
number and a message). The form is emailed straight to the committee
members' login emails, with the family's email as the reply address, and
nothing is saved in Toran's database. Only claimed mandirs can take
requests, and only the server, with the secret key, can look up where a
request goes (`request_recipients`).

## Consequences

- Committees answer in their own email, as they already do; Toran doesn't
  track whether a request was answered or a booking made.
- No new personal data is kept, so nothing new to delete. Resend's
  delivery log holds the email for its usual time.
- The same spam guards as the other forms apply (a hidden field, the
  ten-minute counter, the junk check), and the form can only ask for what
  the committee listed.
- If a committee member's email changes, requests follow their login.
- Without an email service set up (`RESEND_API_KEY`, `DIGEST_FROM`) the
  form says it couldn't be sent and suggests calling the mandir.
