# 0015. Count visits with Toran's own counter, not an analytics service

Date: 2026-10-18
Status: Proposed

## Context

For the pilot Toran needs simple numbers to show mandirs: how often their
page and events were seen, added to calendars and shared. Decision 0006
says collect the least personal data possible, and the privacy notice
promises no tracking cookies. Analytics services cost money (Plausible is
about £9 a month) or, like Google Analytics, track people and need a
cookie banner.

## Decision

Toran counts with its own table, `daily_counts`: per day, per public page,
a running total of views, calendar adds, calendar subscriptions and shares.
The page sends only its own address; the server adds one. No cookies, no
IP addresses, browsers or devices are kept. Browsers that send Do Not
Track or Global Privacy Control, and known bots, aren't counted.

## Consequences

- Free, nothing personal held, and no cookie banner needed.
- Only totals: no unique visitors, where people came from, or journeys.
  That's enough for the pilot; if we need more, revisit with Plausible.
- Anyone could add to the counts by calling the counter, so they're a
  guide, not an audit. The database only counts real public pages (the
  mandir, event or festival must exist), so junk can't pile up.
- Numbers are a little lower than the truth (privacy settings, bots).
