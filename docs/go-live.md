# Going live: the checklist

Everything to do, in order, to move Toran from the test database
(`toran-staging`) to its own live one (`toran-prod`) and open it to the
pilot. Each step points to where it's explained in full. Tick them off
here as you go; Claude can check the ones marked **(Claude checks)**.

Never paste keys or passwords into a chat. Type them straight into
Supabase, Vercel or GitHub.

## 1. A week before

- [ ] **Practise the restore** on `toran-staging` (docs/backup-and-restore.md,
      "The restore drill"), and write it in the drill log.
- [ ] **Decide on Supabase's paid plan** for `toran-prod`. The free plan has
      no backups you can restore (docs/backup-and-restore.md).
- [ ] **Read the legal pages** once more (`/privacy`, `/terms`) and check
      the ICO registration and DPIA (decision 0006) are done if anything
      collecting the public's details is being switched on.
- [ ] **CI is green on `main`** and every open pull request you want in the
      pilot is merged. **(Claude checks)**

## 2. The live database

- [ ] **Supabase → New project** `toran-prod`, in the London region (or the
      nearest EU one). Save its database password in your password
      manager.
- [ ] **GitHub → Settings → Secrets and variables → Actions**: add
      `SUPABASE_PRODUCTION_PROJECT_REF` (the code in its Project URL) and
      `SUPABASE_PRODUCTION_DB_PASSWORD`.
- [ ] **GitHub → Actions → Database → Run workflow**, target
      `production`. The "Apply migrations" step goes green. **(Claude checks)**
- [ ] **Bring the pilot's data across**: committees' changes, events, seva
      rotas and logins live only in `toran-staging`. Make a backup of it
      and restore it into `toran-prod` with the commands in
      docs/backup-and-restore.md ("Making a backup by hand", then the
      restore steps, pointed at `toran-prod`).

## 3. Logins on the live database

In Supabase → `toran-prod` → **Authentication** (docs/app-setup.md,
"Pull request 4 — login and roles"):

- [ ] **URL Configuration**: the site URL is the live address, and the
      redirect URLs are only the live address (`https://<live address>/**`).
      Not the preview pattern: anyone can make a preview address.
- [ ] **Sign In / Providers → Email**: **Confirm email** is on.
- [ ] **Multi-Factor**: **TOTP** is on.
- [ ] **Emails → SMTP Settings**: a real email sender (Resend or Postmark).
- [ ] **Rate Limits**: emails per hour raised to about 30.
- [ ] **SQL Editor**: add yourself as a Toran admin (the SQL is in
      docs/app-setup.md), log in at `/login`, then set up your
      authenticator app at `/ops`.

## 4. The live site

In **Vercel → Project → Settings → Environment Variables**, for
**Production** only, from `toran-prod` (docs/app-setup.md):

- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`:
      `toran-prod`'s. Preview keeps `toran-staging`'s.
- [ ] `SUPABASE_SECRET_KEY`: a new secret key made in `toran-prod`, named
      `vercel-nightly`. Delete the old one in `toran-staging` if it isn't
      needed there any more.
- [ ] `CRON_SECRET`: can stay as it is.
- [ ] `ANTHROPIC_API_KEY` (only if reading posters is wanted) and
      `NEXT_PUBLIC_SENTRY_DSN`: as before.
- [ ] **Redeploy** the latest Production deployment.
- [ ] **The real domain**, if there is one: Vercel → Settings → Domains.
      Then GitHub → Settings → Secrets and variables → Actions →
      **Variables** → `SITE_URL`, so the hourly uptime check watches it.

## 5. Check it works (about 15 minutes)

- [ ] `/api/health` shows `"database":"ok"`. **(Claude checks)**
- [ ] A mandir page, an event page, What's on and `/my` open on your phone,
      in English and at `/gu`.
- [ ] Log in by email link; `/ops` opens after the authenticator code.
- [ ] A committee member can log in and add a test event, which shows on
      their page. Then remove it.
- [ ] **Vercel → Settings → Cron Jobs → Run** the nightly job; `/ops` →
      Needs attention says "Nightly job last ran …".
- [ ] Open `/api/debug/error` on a preview link; the error shows in Sentry.
- [ ] Make the first backup of `toran-prod` (docs/backup-and-restore.md).

## 6. Opening to search engines (only when you and your partner decide)

- [ ] docs/app-setup.md, "Ready for Google": `launched: true` in
      `lib/site.ts`, then Google Search Console and the sitemap.

## After going live

- The restore drill every three months.
- Watch the GitHub repository, so "site down" issues and Dependabot
  emails reach you.
- `toran-staging` stays as the test copy: preview links use it, and
  migrations reach it first on every merge.
