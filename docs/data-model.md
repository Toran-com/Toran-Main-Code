# Data model

What the database holds and who can do what. The tables are defined in
`supabase/migrations/`; every rule below is tested in
`supabase/tests/database/` on each pull request.

## Tables

| Table               | Holds                                                                                                                                                                             | Personal data?          |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `mandirs`           | Name, town, region, postcode, location, tradition, calendar, website, public phone, charity number, status (listed / claimed / hidden)                                            | No                      |
| `mandir_contacts`   | The committee email Toran uses, and notes. Never public                                                                                                                           | Organisation contact    |
| `mandir_admins`     | Which logged-in person runs which mandir                                                                                                                                          | Links to a login        |
| `mandir_claims`     | "I'm on this mandir's committee" requests, with role and a short message                                                                                                          | Links to a login        |
| `toran_admins`      | People who run Toran                                                                                                                                                              | Links to a login        |
| `festivals`         | Navratri, Diwali and so on                                                                                                                                                        | No                      |
| `festival_dates`    | When each festival falls, per calendar tradition, with source and a verified flag                                                                                                 | No                      |
| `events`            | Title and description (optionally also in Gujarati), kind, start and end (UTC + time zone), repeat rule, place and cost notes, link, festival, status, when and by whom confirmed | Who confirmed (a login) |
| `event_occurrences` | Each actual date of a repeating event                                                                                                                                             | No                      |
| `sources`           | Where a mandir's information comes from (website, forward, admin, …), and how the last website check went                                                                         | No                      |
| `event_claims`      | The review queue: what a source says about an event, with confidence                                                                                                              | No                      |
| `seva_roles`        | Roles an event needs (kitchen, parking), and whether the mandir requires a DBS check                                                                                              | No                      |
| `seva_shifts`       | Shift times and how many people each needs                                                                                                                                        | No                      |

## Starting data

- **106 mandirs**, from the outreach list (91) and the NW London and
  Leicester audit (30), with duplicates merged. Public fields only: name,
  town, region, postcode where known, the mandir's own website, and
  tradition. No emails or phone numbers. Rebuild with
  `python3 scripts/build_directory.py <research-repo> .`; the migration only
  adds mandirs that are missing, so it never overwrites later edits.
- **Festival dates for 2026-27** (Navratri, Dussehra, Dhanteras, Diwali,
  Annakut and New Year, Bhai Dooj, Maha Shivaratri, Holi). All marked
  _not yet checked_ with their source, until a Toran admin checks them
  against a panchang for London.

Toran admins (with the second factor) also have `mandir_admin_list()`,
which shows who looks after a mandir with their login email, and
`remove_mandir_admin()`. When the last person is removed, the mandir can be
claimed again.

Not yet built, on purpose (decision 0006): seva sign-ups and digest
subscribers. They hold the public's personal data, so they arrive with the
rota and digest features, after ICO registration and the DPIA.

## Who can do what

| Table / action        | Visitor                       | Logged-in member | That mandir's admin                                     | Toran admin (with authenticator)                                                                   |
| --------------------- | ----------------------------- | ---------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| See mandirs           | Listed only                   | Listed only      | + their hidden mandir                                   | All                                                                                                |
| Edit a mandir         | No                            | No               | Practical details only (not name, town, region, status) | Everything                                                                                         |
| Add a mandir          | No                            | No               | No                                                      | Yes                                                                                                |
| See contact details   | No                            | No               | Their mandir                                            | All                                                                                                |
| Claim a mandir        | No                            | For themselves   | For themselves                                          | Yes                                                                                                |
| Approve a claim       | No                            | No               | No                                                      | Yes, from `/ops`, which lists pending claims with the claimant's email (`pending_mandir_claims()`) |
| See events            | Published, at visible mandirs | Same             | + their drafts                                          | All                                                                                                |
| Add or edit events    | No                            | No               | Their mandir only                                       | All                                                                                                |
| Delete events         | Never (mark removed)          | Never            | Never                                                   | Never                                                                                              |
| Festivals and dates   | See                           | See              | See                                                     | See and edit                                                                                       |
| Sources, review queue | No                            | No               | Their mandir                                            | All                                                                                                |
| Rota roles and shifts | See (for visible events)      | See              | Edit for their events                                   | All                                                                                                |

"Confirmed by" on an event is always set to the person who confirmed it,
whatever the app sends. A Toran admin without the authenticator step has no
admin powers.
