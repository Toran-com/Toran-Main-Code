# 0028. Email whoever adds an event that it's live, with a WhatsApp button

Date: 2026-11-25
Status: Proposed

## Context

A committee member who adds an event sees "Added" on the committee page
and moves on. Most families hear about mandir events on WhatsApp, so the
event fills up when someone shares it there, and the moment to remind
them is right after they've added it. Milan asked for a confirmation when
a committee adds an event.

## Decision

When a committee member puts events on their mandir's page (adds one,
ticks several festivals or last year's events, or publishes a poster or
WhatsApp message), the person who pressed the button gets one email, "It's
live", listing each event with its link and a Share on WhatsApp button.
It goes to them only, not the whole committee, and only while committee
emails are on (`COMMITTEE_EMAIL`, decision 0023). It's sent after the page
has gone back to them, so it never slows the button down, and a failed
send changes nothing.

## Consequences

- Every new event comes with a one-tap way to share it.
- It's a reply to something the person just did, so it has no stop link;
  it says why it came and that it only comes when they add events.
- Adding events that merge into ones already listed sends nothing: only
  new events are "live".
