# 0012. Every event has its own page and address

Date: 2026-10-15
Status: Proposed

## Context

Most mandir news travels as links in WhatsApp groups. Until now an event's
link pointed at its card on the mandir's page (`/mandirs/<mandir>#event-<id>`).
That has three problems:

- the link preview shows the mandir, not the event, so the message has to
  carry all the details;
- the part after `#` never reaches the server, so the page can't describe
  the event to WhatsApp, Facebook or search engines;
- a mandir page lists its next 50 events, so the card for a later event,
  or one that has finished, is missing.

Links in WhatsApp chats, calendars and printed posters live for years, so
whatever address we choose is hard to change later.

## Decision

- Each event lives at **`/mandirs/<mandir>/events/<event id>`**. The id is
  the event's database id, which never changes, so editing an event's name
  or date never breaks a link. (A readable name in the address would read
  better but would need redirects whenever a title changes; not worth it
  yet.)
- Everything that links to an event uses this address: sharing, What's on,
  the weekly digest, calendar files and the seva rota message. It all comes
  from `eventPath()` in `lib/share.ts`.
- The page has its own link preview picture, title and description, and
  search engine data for the event (decision S1 in the PR history).
- A finished event's page still loads, says it has finished and points to
  the mandir's page. It asks search engines not to list it.
- Old links to the card (`/mandirs/<mandir>#event-<id>`) keep working:
  the cards keep their ids.

## Consequences

- People sharing an event send one link that previews properly.
- Event pages are static, like mandir pages: rebuilt when the mandir's
  events change, and an event added after a deploy is rendered on its
  first visit.
- An event deleted from the database (rather than cancelled) gives "not
  found". Committees cancel rather than delete, so this should be rare.
- Moving a mandir to a new address (slug) would break its events' links
  too; a slug change would need redirects for both.
