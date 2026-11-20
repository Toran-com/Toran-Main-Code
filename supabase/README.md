# Database

Supabase (Postgres). Every change to the database is a numbered SQL file in
`migrations/`, applied in order. Never change the live database by hand
(decision 0009).

- `config.toml` — settings for the local Supabase stack
- `migrations/` — one file per change, named `YYYYMMDDHHMMSS_what_it_does.sql`
- `data/mandirs.csv` — the starting mandir directory (public fields only),
  built by `scripts/build_directory.py` from the research lists and loaded by
  the `initial_directory` migration
- `tests/database/` — pgTAP tests of who can see and change what

## Working locally

Needs Docker. From the repo root:

```bash
pnpm dlx supabase start          # local database, API and Studio
pnpm dlx supabase migration new add_something   # new empty migration file
pnpm dlx supabase db reset       # rebuild local database from migrations
pnpm dlx supabase stop
```

`supabase start` prints a local API URL and publishable (anon) key; put
them in `.env.local` to point the app at the local database.

## Login emails

`templates/login.html` is the email with the login link and code, in
Toran's look. `config.toml` uses it for the local stack. The hosted projects
keep their email settings in the Supabase dashboard, so set them by hand for
each project:

1. **Authentication → Emails → SMTP Settings**: turn on custom SMTP, so the
   emails come from Toran's own address through Resend rather than
   Supabase's shared one (which often lands in junk, and only sends a few
   emails an hour). Host `smtp.resend.com`, port `465`, username `resend`,
   password a Resend API key (resend.com → API Keys, typed in yourself),
   sender email `hello@toran.org.uk`, sender name `Toran`. toran.org.uk is
   already verified in Resend. In Resend, leave open and click tracking
   off for the domain: rewritten links and tracking pictures count against
   an email with spam filters.
2. **Authentication → Email Templates**: paste `templates/login.html` into
   both **Magic link** and **Confirm signup**, with the subject "Log in to
   Toran". Keep the button the first link in the email: the end-to-end
   tests follow the first link. Its link leads to `/auth/confirm` with a
   `token_hash`, then to a page with a "Log in" button, so email programs
   that open links to check them can't use it up; its code can be typed in
   instead.
3. **Authentication → Sign In / Providers → Email**: **Email OTP
   Expiration** `86400` (24 hours, the most allowed), as the email says.
4. **Authentication → Rate Limits**: emails sent per hour about `100`
   (only possible once custom SMTP is on). It's for the whole site, so a
   small number stops people logging in on a busy day.

### Keeping login emails out of junk

The emails pass SPF, DKIM and DMARC for toran.org.uk (checked from a
received email's headers, Nov 2026). What's left is the domain's
reputation: a new domain's emails often go to junk until people open them
and mark them "Not spam", which the page after "Email me a link" asks them
to do. To help it along:

- **Google Postmaster Tools** (postmaster.google.com): add toran.org.uk and
  add the TXT record it gives, to see Gmail's spam rate and the domain's
  reputation.
- **DMARC reports**: change the `_dmarc.toran.org.uk` TXT record to
  `v=DMARC1; p=none; rua=mailto:hello@toran.org.uk` to get a daily report
  of who sends as toran.org.uk. Keep `p=none` while anything else sends as
  hello@toran.org.uk (Gmail's "Send mail as", say), or those emails would
  be junked.
- **Test the score**: on mail-tester.com, copy the address it shows, ask
  Toran's login page to email it, then press "Then check your score".

## How changes reach the real database

1. A pull request adds a migration. The **Database** check starts a fresh
   Supabase on GitHub, applies every migration and runs the database linter.
2. When the pull request is merged to `main`, the **Database** workflow
   applies new migrations to `toran-staging`.
3. Once `toran-prod` exists, the same workflow is run by hand to apply them
   to the live database.
