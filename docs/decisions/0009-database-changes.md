# 0009. Database changes only through migrations, one Supabase project until launch

Date: 2026-10-11
Status: Proposed

## Context

The database holds mandir and event data now and personal data later. Hand
edits to a live database can't be reviewed, repeated or undone. Supabase's
free plan allows two projects, and an unused free project pauses after a
week.

## Decision

- Every database change is a SQL file in `supabase/migrations/`, reviewed in
  a pull request. Merged files are never edited; a fix is a new migration.
- The **Database** workflow checks each pull request on a fresh database,
  applies merged migrations to `toran-staging` automatically, and applies
  them to `toran-prod` only when run by hand.
- Until the pilot launch there is one project, `toran-staging`, used by both
  the preview and the live site. `toran-prod` is created before any real
  personal data is collected, and from then on the live site uses it alone.

## Consequences

Every change is reviewed, repeatable on a laptop and recorded. The live
"coming soon" site shares a database with previews until launch, which is
fine while it holds no personal data. Applying migrations needs three
GitHub secrets (a Supabase access token, the project reference and the
database password).
