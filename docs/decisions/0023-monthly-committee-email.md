# 0023. Email each committee member monthly, with a link to stop it

Date: 2026-11-24
Status: Proposed

## Context

Committees keep posting when they can see their page working (decision
0022). The monthly email was written and previewed but not sent until the
ICO registration and DPIA were done (decision 0006). They are now.

## Decision

The weekly job sends each committee member, at their login email, the
monthly email about their mandir's page, once a month: on the first
Thursday, with any left over the week after. A committee whose first
member joined in the last two weeks waits for next month. Each email has a
signed link (made from CRON_SECRET, so nothing is stored) that stops it for
that member and mandir; email programs' own Unsubscribe button works too.
Toran keeps which mandirs' committees have had each month's email, not
who. It's off until COMMITTEE_EMAIL is "on" in Vercel.

## Consequences

- Committees see their numbers without logging in, and a nudge when their
  page needs something.
- Changing CRON_SECRET breaks old stop links (as for the weekly email).
- A member who stops it still sees everything on their Numbers page.
