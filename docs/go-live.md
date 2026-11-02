# Going live: the checklist

Everything to do, in order, to move Toran from the test database
(`toran-staging`) to its own live one (`toran-prod`) and open it to the
pilot. Each step points to where it's explained in full. Tick them off
here as you go; Claude can check the ones marked **(Claude checks)**.

Parts of steps 5 and 0 rely on pull requests 137 (the consent boxes), 138
(the legal drafts), 139 (the "checks need a look" alert) and 140 (the
small-phone fixes) being merged first.

Never paste keys or passwords into a chat. Type them straight into
Supabase, Vercel or GitHub.

## 0. Only the founders can do these

Accounts, money, signatures and promises in the company's name. Claude
can't do them, but can check most of them afterwards. Start the slow ones
(company, domain, ICO) first.

**The company and its name**

- [ ] **The company** is registered (decision 0007): its name, number and
      registered office go in the privacy notice and terms.
- [ ] **The domain** (toran.org.uk was free on 31 October), bought in the
      company's name, with two addresses both founders can read: one for
      privacy requests (e.g. `privacy@`) and one for everything else
      (e.g. `hello@`). Put the second in `CONTACT_EMAIL` in `lib/site.ts`.
- [ ] **ICO registration**: ico.org.uk → "Pay the data protection fee",
      £52 a year (£47 by direct debit). The number goes in the privacy
      notice.

**Accounts and plans**

- [ ] **Supabase Pro** for `toran-prod` (about $25 a month): the free plan
      has no backups you can restore, and pauses after a week without
      visits. Pro keeps 7 days of daily backups.
- [ ] **Vercel plan**: the free Hobby plan is for personal, non-commercial
      use. Read Vercel's fair use terms and decide whether Toran, run by a
      company, needs Pro ($20 a month per member). Pro also keeps logs for
      a day instead of an hour.
- [ ] **Company accounts, not personal ones** (decision 0007) for GitHub,
      Supabase, Vercel, Sentry, Resend and Anthropic, or at least both
      founders added to each.
- [ ] **Two-factor login on every founder account**: GitHub, Supabase,
      Vercel, Sentry, Resend, Anthropic, the domain registrar and the email
      accounts behind them. (DPIA risk R10.)

**Data protection paperwork** (docs/legal/README.md has the details)

- [ ] **Accept each provider's data processing agreement** for the
      company's accounts: Supabase, Vercel, Sentry, Resend and Anthropic.
- [ ] **Look up three regions** and fill them in the privacy notice:
      Supabase (Settings → General, we want London), Sentry (the
      `NEXT_PUBLIC_SENTRY_DSN` contains `ingest.de.sentry.io` for the EU)
      and Resend (Domains).
- [ ] **Fill in every [bracket]** in docs/legal/privacy-notice.md and
      terms.md, then set `legalChecked: true` in `lib/site.ts` (a test
      refuses it while a bracket is left).
- [ ] **Sign off the DPIA** (section 9) and name who leads in the breach
      plan (docs/legal/breach-plan.md).
- [ ] **A solicitor's look** at the privacy notice and terms: worth it
      before the weekly email is switched on.

## 1. A week before

- [ ] **Practise the restore** on `toran-staging` (docs/backup-and-restore.md,
      "The restore drill"), and write it in the drill log.
- [ ] **Read the legal pages** once more (`/privacy`, `/terms`).
- [ ] **CI is green on `main`** and every open pull request you want in the
      pilot is merged. **(Claude checks)**

## 2. The live database

- [ ] **Supabase → New project** `toran-prod`, in the London region
      (`eu-west-2`), on the Pro plan. Save its database password in your
      password manager.
- [ ] **GitHub → Settings → Secrets and variables → Actions**: add
      `SUPABASE_PRODUCTION_PROJECT_REF` (the code in its Project URL) and
      `SUPABASE_PRODUCTION_DB_PASSWORD`.
- [ ] **GitHub → Actions → Database → Run workflow**, target
      `production`. The "Apply migrations" step goes green. This also makes
      the storage bucket for mandir photos. **(Claude checks)**
- [ ] **Bring the pilot's data across**: committees' changes, events, seva
      rotas, mandir photos and logins live only in `toran-staging`. Make a
      backup of it and restore it into `toran-prod` with the commands in
      docs/backup-and-restore.md ("Making a backup by hand", then the
      restore steps, pointed at `toran-prod`). Photos are files, not
      database rows: download them from Storage → `mandir-photos` in
      staging and upload them to the same paths in `toran-prod`.

## 3. Logins on the live database

In Supabase → `toran-prod` → **Authentication** (docs/app-setup.md,
"Pull request 4 — login and roles"):

- [ ] **URL Configuration**: the site URL is the live address, and the
      redirect URLs are only the live address (`https://<live address>/**`).
      Not the preview pattern: anyone can make a preview address.
- [ ] **Sign In / Providers → Email**: **Confirm email** is on.
- [ ] **Multi-Factor**: **TOTP** is on.
- [ ] **Emails → SMTP Settings**: Resend, with the domain verified in
      Resend (it gives DNS records to add at the domain registrar).
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
- [ ] `CRON_SECRET`: can stay as it is. **Never change it once the weekly
      email is on**: its unsubscribe links are made from it.
- [ ] `NEXT_PUBLIC_SENTRY_DSN`: as before, for Production and Preview.
- [ ] `ANTHROPIC_API_KEY`, only if reading posters is wanted (decision
      0018).
- [ ] **Leave the weekly email off** (`DIGEST_SIGNUPS` unset) until the
      ICO registration and DPIA are done (decision 0006). Switching it on
      later is in docs/app-setup.md, "Weekly email (built, switched off)".
- [ ] **Redeploy** the latest Production deployment.
- [ ] **The real domain**: Vercel → Settings → Domains. Then GitHub →
      Settings → Secrets and variables → Actions → **Variables** →
      `SITE_URL`, so the hourly uptime check watches it.
- [ ] **Watch** the GitHub repository (top right), so "site down" and
      "checks need a look" issues reach you by email.

## 5. Check it works (about 20 minutes)

- [ ] `/api/health` shows `"database":"ok"` and `"errorReports":"on"`.
      **(Claude checks)**
- [ ] **Vercel → Settings → Cron Jobs → Run** the nightly job. Then
      `/api/health` shows `"nightly":"ok"`, and `/ops` → Needs attention
      says "Nightly job last ran …". **(Claude checks)**
- [ ] **GitHub → Actions → Uptime → Run workflow**: it goes green and opens
      no issue. **(Claude checks)**
- [ ] Open `/api/debug/error` on a preview link; the error shows in Sentry,
      and Sentry emails you about it.
- [ ] On your own phone: a mandir page, an event page, What's on and `/my`,
      in English, at `/gu` and at `/hi`, then again with "Aa" set to the
      largest text. Nothing should slide sideways.
- [ ] Log in by email link; `/ops` opens after the authenticator code.
- [ ] A committee member can ask to look after a page (with the two
      boxes ticked), you approve it, and they add a test event, which shows
      on their page. Then remove it.
- [ ] Make the first backup of `toran-prod` (docs/backup-and-restore.md).

## 6. Opening to search engines (only when you and your partner decide)

- [ ] docs/app-setup.md, "Ready for Google": `launched: true` in
      `lib/site.ts`, then Google Search Console and the sitemap.

## After going live

- The restore drill every three months.
- Answer "site down" and "checks need a look" issues; each closes itself
  when the problem is gone.
- `toran-staging` stays as the test copy: preview links use it, and
  migrations reach it first on every merge.
- Look at the legal pages again whenever Toran starts collecting something
  new, and at least once a year (docs/legal/README.md).
