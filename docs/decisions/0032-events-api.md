# 0032. Committees connect their own website with one button (and a key for developers)

Date: 2026-11-26
Status: Proposed

## Context

Milan asked for an easier way to add events, "even if this is API or
endpoint relations". A first version gave each mandir a key for its web
developer, but most mandirs don't have one, and handing a key to someone
is too much to ask. A survey of the 75 mandir websites Toran has on file
(26 November 2026) found:

- 4 publish their events as data Toran can read now (a Google Calendar,
  WordPress's The Events Calendar, a web app's events feed);
- 36 show posters or patrikas (pictures or PDFs) Toran's AI can read;
- 8 write dates on their pages but publish nothing machine-readable;
- 3 use Wix's events, which only load in a browser;
- 18 show nothing Toran can read, and 6 couldn't be reached.

## Decision

**One button.** In **Add events → Connect your website**, the committee
sees its website's address (filled in when Toran has it) and presses
**Connect my website**. Toran reads it there and then (up to about half a
minute) and says what it found:

- Events the website lists as data go on the page straight away,
  confirmed by the mandir, unless the committee unticks "Put the events
  your website lists on Toran straight away"; then they wait to be
  checked.
- Posters and patrikas on the site are read with AI (two straight away,
  the rest over the next nights, each once) and always wait under
  "Posters waiting for you".
- If nothing can be read, the card says so, offers the forwarding
  address (decision 0031) and an **Ask Toran to help** button, which
  emails Toran's admins which mandir (not who) so they can help by hand.

Toran then reads every connected website each night (`/api/cron/websites`,
after the nightly job), longest ago first, at most 20 posters a night in
all to keep the AI bill small. Connected websites are left out of the
nightly job's own website checks. The committee can change both choices,
read it again now, or stop it at any time.

**A key for developers**, tucked under "For web developers" on the same
card, for the few mandirs whose own system can send its events: up to five
keys per mandir, each shown once with only its SHA-256 hash kept, and an
API (`/api/v1/events`) to add, change, list, cancel and remove events by
the system's own ids, checked by the same rules as the committee's form,
published straight away, 300 requests per key in ten minutes. Instructions
for the developer are at `/for-mandirs/events-api`.

## Consequences

- Connecting a website is one press for a committee. Toran's own work
  (reading pages, calendars, plugins and posters) does the rest.
- What a website lists as data is trusted as the mandir's own, so it can
  go live unchecked; what AI reads never is (decision 0018).
- Only 4 websites can go fully automatic today. For most, the button means
  Toran reading their posters each night, which saves typing but still
  needs a check. Wix events and dates written in page text aren't read
  yet; reading page text with AI could come next.
- Toran keeps which posters it has read (their addresses, a year) and how
  each website's last read went. No personal data beyond who connected it.
- A leaked developer key can put events on that mandir's page until a
  committee member stops it.
