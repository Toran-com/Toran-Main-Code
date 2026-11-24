# 0026. Live now is worked out on the phone, from the events mandirs list

Date: 2026-11-24
Status: Proposed

## Context

Families want to know what's on at a mandir right now: an aarti they can
still catch, a katha that's started, a stream they can watch from home.
Toran's pages are built ahead of time and kept for hours, so a page can't
know the moment it's opened. Toran doesn't read YouTube or social media to
find out whether a stream is actually on (decision 0005).

## Decision

`/live` and a "Happening now" line on the home page come with every
published event from yesterday to three days ahead. The visitor's phone
works out each minute which are on now and which are later today, in UK
time, as "Open now" already does. An event is on from its start to its
end time; without one, an aarti lasts 45 minutes and anything else two
hours; an all-day event lasts until midnight. While an event is on at a
mandir with a livestream link, "Watch live" opens it.

## Consequences

- Nothing is counted or kept; it needs no account and works from a saved
  page.
- "Live" means "listed as happening now", not "streaming now": Toran can't
  tell whether a stream has started without reading other sites.
- Events with no end time are a guess. Committees can add an end time to
  make it exact.
- The page carries a few days of events, so it stays right for hours
  after it was built, and is refreshed whenever an event changes.
