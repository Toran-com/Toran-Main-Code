# 0032. A mandir's own website or booking system puts its events on Toran with a key

Date: 2026-11-26
Status: Proposed

## Context

Some mandirs already keep their events in their own website, booking
software or app. Toran can read a public calendar each night, but those
events wait for the committee to check, and a system without a calendar
feed can't be read at all. Milan asked for an easier way to add events,
"even if this is API or endpoint relations".

## Decision

A committee member makes a key on the committee page (**Your mandir →
Your website or booking system**), names it ("Our website") and gives it
to whoever runs the system, with the instructions at
`/for-mandirs/events-api`. The key is shown once; Toran keeps only its
SHA-256 hash and its first few characters. Up to five working keys per
mandir; any committee member can stop one.

With the key, the system can:

- `PUT /api/v1/events/<its own id>`: add an event, or change the one it
  added with that id.
- `POST /api/v1/events`: up to 100 at once.
- `GET /api/v1/events`: list what it has added.
- `DELETE /api/v1/events/<id>`: take one off. Sending
  `"status": "cancelled"` shows it as cancelled instead.

Each event is checked by the same rules as the committee's form and
published straight away, confirmed by the mandir, with the origin `api`.
An event already on the page with the same name on the same day is taken
over rather than copied. Up to 300 requests per key in ten minutes.

The API runs as the site's own database user (`SUPABASE_SECRET_KEY`), only
after the key has been matched to its mandir; `edit_event` lets that user
change an event.

## Consequences

- A mandir with its own system adds an event once, there, and it's on
  Toran within seconds, kept up to date and cancelled with it.
- A leaked key can put events on that mandir's page until a committee
  member stops it. They can see each key's last use, and every event says
  where it came from on their page.
- The committee can still change any event; the system's next change to
  it replaces theirs.
- No personal data is sent or kept: events only. Who made each key is
  kept with it, like any committee change.
