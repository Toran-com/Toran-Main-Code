# 0031. Committees forward posters to their mandir's own Toran email address

Date: 2026-11-25
Status: Proposed

## Context

Most mandirs already get their posters, patrikas and event messages by
email or WhatsApp. Committees can photograph a poster or paste a message
on their committee page (decision 0018), but that means logging in. Milan
asked for an easier way to add events. Forwarding an email is something
every committee member already knows how to do, on any phone.

## Decision

Each mandir that is looked after on Toran has its own address,
`<mandir slug>@<INBOUND_DOMAIN>`, shown on its committee page under
"Add events" → "Forward it by email". Resend receives the email and tells
Toran (`/api/inbound/email`, signed with the webhook secret). Toran then:

1. Reads the email once, however many times it's delivered.
2. Reads nothing that isn't really from the address it says: Resend's
   DKIM check (signed by the sender's own domain) or DMARC must pass. A
   forged email gets no reply.
3. Reads only emails from the address a member of that mandir's committee
   logs in with (confirmed). Someone on several committees sends to the
   mandir's own address; someone on one can send to any address there.
4. Reads up to three posters (pictures or PDFs, not logos) and the words
   of the email, with the same reader as the committee page, after taking
   out the forwarding lines, email addresses and phone numbers.
5. Puts the events in "Posters waiting for you", marked as from "Email".
   Nothing is published until a person presses Publish.
6. Replies to the sender with what it found and a button to check it, or
   why it couldn't read it.

Up to 20 emails a day are read for each mandir. Toran keeps only Resend's
id for each email, which mandir it was for, how it went and how many
events it found, for 30 days: not the sender, the message or the
attachments.

## Consequences

- A committee can add a month of events by forwarding the patrika email
  they already have, from their phone, without logging in.
- People who aren't on a committee can't fill a mandir's queue, and a
  forged sender can't either. A mandir whose own email domain has no
  DKIM or DMARC can't use it from that address: they forward from the
  address they log in with on another provider.
- The email passes through Resend (as Toran's sent emails do) and its
  pictures and words go to Anthropic to be read, as on the committee page.
- Off until `INBOUND_DOMAIN`, `RESEND_WEBHOOK_SECRET`, `RESEND_API_KEY` and
  `ANTHROPIC_API_KEY` are all set (docs/app-setup.md); the card only shows
  once it's on.
