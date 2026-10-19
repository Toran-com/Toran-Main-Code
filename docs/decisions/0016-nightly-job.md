# 0016. A nightly job, run by Vercel Cron with the database's secret key

Date: 2026-10-20
Status: Proposed

## Context

Some work should happen without anyone pressing a button. The retention
policy (docs/legal/retention.md) promises deletions on a schedule, which
were done by hand. The website checker only ran when a Toran admin pressed
"Check the next 5 websites". A job with nobody signed in can't act as a
Toran admin, so it needs its own way into the database.

## Decision

One job, `/api/cron/nightly`, runs every night at about 02:15 (UTC) by
Vercel Cron (free on our plan, set in `vercel.json`). It calls
`run_retention()` in the database, then checks up to 12 mandir websites,
the ones checked longest ago, and leaves a line of totals in `job_runs`.

- Vercel sends `CRON_SECRET` with each run; anyone else gets "not found".
- The job uses Supabase's secret key (`SUPABASE_SECRET_KEY`), only on the
  server and only in this route (`lib/supabase/robot.ts`).
- `run_retention()` can only be run with that key, not by Toran admins.

## Consequences

- Deletions happen when the policy says, without anyone remembering.
- All 69 websites are checked about once a week, and new events reach the
  poster queue for committees to check.
- `/ops/attention` shows when the job last ran, and warns if it stops.
- The secret key can read and change everything, so it lives only in
  Vercel's settings (Production), never in the code, the chat or a
  browser. If it leaks, roll it in Supabase and update Vercel.
- Vercel's free plan runs the job once a day, at some point within the
  hour, and stops it after 60 seconds, so a night's checks are limited.
