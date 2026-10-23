# Site map and journeys — October 2026

Every page on Toran, who it's for, and where it leads, with the three
journeys through them. Families' pages also exist in Gujarati at the same
address with `/gu` in front (a draft until checked: see "Translations" in
`docs/app-setup.md`). Checked by walking every journey on a phone, in
English and Gujarati, and by following every link from the home page.

## Families

| Page                   | Address                              | For                                                                     | Leads to                                                                          |
| ---------------------- | ------------------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Home                   | `/`                                  | What's on near you, the next festival season, coming up                 | What's on, a season page, festival dates, mandirs, each event                     |
| What's on              | `/whats-on`                          | Every event, by date; near a postcode; by kind, region                  | Each event, each mandir                                                           |
| Seva                   | `/seva`                              | Seva mandirs are asking for: near me, kind, day, map; take a slot there | Each event's seva rota                                                            |
| Mandirs                | `/mandirs`                           | Every mandir, on a map or as a list by region and town                  | Each mandir; What's on near one                                                   |
| A mandir               | `/mandirs/<mandir>`                  | Its events, address, website, calendar feed, print                      | Each event, "Tell us about an event", look after this page, festival dates, print |
| An event               | `/mandirs/<mandir>/events/<id>`      | One event to share: when, where, calendar, WhatsApp                     | Its seva rota, the mandir, What's on                                              |
| Help with seva         | `/mandirs/<mandir>/events/<id>/seva` | Take a seva slot, no name needed                                        | The event                                                                         |
| Tell us about an event | `/mandirs/<mandir>/tell-us`          | Send in an event the mandir hasn't listed                               | Back to the mandir                                                                |
| Festival dates         | `/festivals`                         | Every festival's dates, by month; the season pages                      | Each season page, each festival                                                   |
| A festival             | `/festivals/<festival>`              | Its dates and which mandirs are marking it                              | Its season page, each event                                                       |
| Festival seasons       | `/diwali`, `/navratri`, `/holi`, …   | Every mandir's events for one season, near you                          | Each festival day, each event, calendar feed                                      |
| Calendar feeds         | `…/calendar.ics`                     | Subscribe in a phone's calendar                                         | —                                                                                 |
| Offline                | `/offline`                           | Shown by the installed app with no signal                               | Pages already opened                                                              |

## Mandir committees

| Page                  | Address                             | For                                                            | Leads to                                           |
| --------------------- | ----------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- |
| For mandir committees | `/for-mandirs`                      | What Toran does for a mandir, free                             | The guide, the demo, finding your mandir           |
| Committee guide       | `/for-mandirs/guide` (and `/print`) | How it works, step by step; a one-page handout                 | Finding your mandir, the demo                      |
| Try it                | `/demo`                             | A sample mandir to click around                                | Finding your mandir, What's on                     |
| Look after this page  | `/mandirs/<mandir>/claim`           | Ask to look after a mandir's page                              | Your account (after logging in)                    |
| Log in                | `/login`                            | Email link, no password                                        | Your account                                       |
| Your account          | `/account`                          | Your mandirs, invites to accept, requests being checked        | Each mandir's committee page                       |
| Committee page        | `/manage/<mandir>`                  | Posters to check, events, festivals to add, committee, details | Edit an event, a seva rota, the public page, print |
| Edit an event         | `/manage/<mandir>/events/<id>`      | Change an event                                                | The committee page                                 |
| Seva                  | `/manage/<mandir>/seva`             | Every rota, what's still short, one message for the group      | Each seva rota, the Seva page                      |
| Seva rota             | `/manage/<mandir>/seva/<id>`        | Roles and shifts; the message for the volunteers' group        | The public seva page                               |
| Print a notice        | `/mandirs/<mandir>/print`           | One page of what's on, with a QR code                          | —                                                  |

## Toran admins (`/ops`, with an authenticator app)

| Page             | Address             | For                                                                                  |
| ---------------- | ------------------- | ------------------------------------------------------------------------------------ |
| Overview         | `/ops`              | Requests to look after a page; mandirs missing a map position; the authenticator app |
| Needs attention  | `/ops/attention`    | Everything to follow up, and whether the nightly job ran                             |
| Mandirs          | `/ops/mandirs`      | Add, correct or hide a mandir                                                        |
| Posters / Review | `/ops/posters`      | What's waiting before it goes on the site; type up a poster                          |
| Duplicates       | `/ops/duplicates`   | Copies of events already on Toran to merge, and mandirs that may be listed twice     |
| Websites         | `/ops/websites`     | The website checker                                                                  |
| Festival dates   | `/ops/festivals`    | Check dates against a second calendar                                                |
| Stats            | `/ops/stats`        | Visits, calendar adds and shares, with no personal data                              |
| Digest           | `/ops/digest`       | Preview of the weekly email (nobody receives it yet)                                 |
| Translations     | `/ops/translations` | The Gujarati, numbered, for a native speaker to check                                |

## The journeys

1. **A family finds something to go to.** Home → What's on (near their
   postcode) → an event → add to calendar or share on WhatsApp → the mandir
   → its other events. Or: Home → the season banner → Diwali at UK mandirs
   → an event. Or: Festival dates → a season page or a festival → the
   mandirs marking it.
2. **A family tells Toran about an event.** A mandir → "Tell us about an
   event" → thanks → it waits for the committee or Toran to check.
3. **A committee joins.** For mandir committees → the guide or the demo →
   find their mandir → "Look after this page" → log in → Toran checks with
   the mandir → their account → the committee page → add events, tick
   festivals, invite a colleague → share the page and print the notice.
4. **A committee keeps it right.** Log in → account → committee page →
   check posters, press "Still on", run a seva rota.
5. **Toran keeps it running.** `/ops/attention` each day → the review
   queue → requests to look after a page → festival dates to check.

## What the walk-through found and fixed (this pull request)

- **Festival dates didn't lead to the season pages.** The seven season
  pages could only be reached from the home banner (in the weeks before a
  season) or from one festival's page. Festival dates now lists them
  first, soonest first, each with its main festival's dates.
- **Regions were in English on Gujarati pages** (the mandir list's
  headings, a mandir's address line, What's on's region filter). Now in
  Gujarati, written as UK Gujaratis say them (ઈસ્ટ મિડલેન્ડ્સ, લંડન).
- **The Gujarati home page's browser tab and link preview were in
  English.** Now in Gujarati.
- **"Page not found" only offered the home page.** It now offers What's
  on, the mandir list and festival dates too.

Looked at and fine: every link from the home page reaches a page (110
pages followed; the "Add to Google Calendar" links need their event, and
work); every page has a way on; the same things are called the same names
across the site ("Log in", "seva rota", "Look after this page", "What's
on").

## Made coherent in the other pull requests of this round

- **Pages about Toran** (privacy, terms, about, contact, accessibility,
  "Correct or remove something"), linked from every footer.
- **Committee home**: "Getting started" and "What needs doing" at the top
  of the committee page, and a summary on the account page.
- **Review queue**: one queue for posters, visitors' events and the
  website checker, with look-alikes flagged and "Fix something first".
