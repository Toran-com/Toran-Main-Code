# Retention schedule (DRAFT)

> Draft for review, [date]. How long Toran keeps each kind of personal
> data, and how it is deleted. Decision 0006: every table with personal
> data has a retention period.

"Automatic" means a scheduled job deletes it (the nightly job, decision
0016: `run_retention()` in the database); "by hand" means a Toran admin
does it on a fixed review date until a job exists. Jobs are built before
each feature launches.

## Held now

| Data                                                 | Where                                      | Kept for                                                                  | How deleted                                                                                            |
| ---------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Committee member logins (email, login history)       | Supabase Auth                              | Until they ask, or 24 months after last login (we email 30 days before)   | By hand at first, quarterly review; automatic job before the pilot ends                                |
| Logins whose emailed link was never used (email)     | Supabase Auth                              | 7 days                                                                    | Automatic, every night                                                                                 |
| Who looks after which mandir                         | `mandir_admins`                            | While they're on the committee; removed when they or the mandir ask       | By hand; also removed automatically when the login is deleted                                          |
| Invites to help run a page (the colleague's email)   | `mandir_invites`                           | Until accepted, declined or cancelled, and never more than 14 days        | Automatic: deleted when used; expired ones are deleted every night (and can no longer be seen or used) |
| Requests to look after a page (role, note)           | `mandir_claims`                            | Approved: 2 years after decision. Rejected: 6 months after decision       | Automatic, every night (decision 0016)                                                                 |
| Who added or confirmed an event                      | `events.created_by`, `events.confirmed_by` | While the login exists                                                    | Cleared automatically when the login is deleted (the event itself stays, as mandir information)        |
| Toran admins' authenticator link                     | Supabase Auth                              | While they're an admin                                                    | Removed with their admin role                                                                          |
| Mandir contact emails (may name a person)            | `mandir_contacts`; outreach records        | While the mandir is listed, or 2 years after last contact if never listed | By hand, yearly review                                                                                 |
| Visit totals per page per day (no personal data)     | `daily_counts`                             | 3 years, for comparing festivals year on year                             | Automatic, every night                                                                                 |
| When the nightly job ran (totals, no personal data)  | `job_runs`                                 | 90 days                                                                   | Automatic, every night                                                                                 |
| Correction and removal requests (no sender details)  | `site_requests`                            | 90 days after a Toran admin marks them done                               | Automatic, every night                                                                                 |
| Error reports (personal data removed before sending) | Sentry                                     | Sentry's default for our plan [about 30 days: check]                      | Automatic (Sentry)                                                                                     |
| Server logs (IP addresses)                           | Vercel                                     | Vercel's default for our plan [check: hours to days]                      | Automatic (Vercel)                                                                                     |
| Database backups                                     | Supabase                                   | Supabase's backup window [7 days on Pro: check]                           | Automatic (Supabase)                                                                                   |

## Coming later (agree before each launches)

| Data                                              | Kept for                                                                                                      | How deleted |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------- |
| Digest subscribers (email, postcode)              | While subscribed; deleted 30 days after unsubscribing                                                         | Automatic   |
| Digest emails that bounce permanently             | Unsubscribed at once; deleted 30 days later                                                                   | Automatic   |
| Rota sign-ups (name, one contact, age band)       | Deleted 90 days after the event                                                                               | Automatic   |
| Under-16 sign-ups: parent's or guardian's details | Deleted 90 days after the event, with the sign-up                                                             | Automatic   |
| Forwarded WhatsApp or email messages and images   | Deleted [90 days] after receipt, once the listing is made                                                     | Automatic   |
| Sender's phone number or email for forwards       | Kept with the mandir's sources while they forward for that mandir; deleted 12 months after their last forward | Automatic   |
| Text sent to the AI service to read posters       | Not kept by us beyond the message itself; [check the provider's retention and training terms]                 | n/a         |

## Requests to delete

Someone asking us to delete their data is dealt with within one month,
whatever the table says. Write down each request, the date, and what was
deleted (without keeping the deleted data itself).
