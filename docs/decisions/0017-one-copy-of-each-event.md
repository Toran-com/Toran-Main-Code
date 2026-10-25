# 0017. One copy of each event

Date: 2026-10-23
Status: Proposed

## Context

Events reach Toran five ways: committees add them, Toran types up
forwarded posters, visitors send them in, the website checker reads them,
and the bulk import pastes in what a person read from mandirs' websites.
The same event often arrives more than once, worded and spelled
differently ("Annakoot darshan", "Annakut", "Nutan Varsh & Annakut").
Until now only an exact name on the same day was skipped, and the review
queue's warning was only a hint: approving both put two copies on the
site. It also warned about different events that named the same festival
(Diwali fireworks and Chopda pujan the same evening).

## Decision

Every route compares a new event with the mandir's events that day by
start time and by the words of its name, with each festival and puja
spelled one way (lib/duplicates.ts), and gets one of three answers:

- **Same**: never listed twice. The event already there gains anything
  new (a time, a description, a link).
- **Maybe**: a person decides once, "same" or "different", and a
  "different" answer is remembered (distinct_events) so nobody is asked
  again.
- **Different**: added as usual.

The database is the last line: it refuses an event with the same name, at
the same mandir, day and time (or either all day) as one already listed,
however it was added. /ops/duplicates lists copies from before, and
mandirs that may be listed twice, to merge or mark as different.

## Consequences

The bulk import and the website checker can be run again safely. A
committee re-adding an event is sent to the one already there. Two
genuinely different events with exactly the same name at the same time
(rare) can't both be listed; one should be renamed. Matching by name
can't be perfect, so "maybe" still needs a person; new spellings are
added to the list in lib/duplicates.ts as they turn up. The same event at
two mandirs (a mandir listed twice) is flagged, not merged: that needs a
person to move the events and hide one listing.
