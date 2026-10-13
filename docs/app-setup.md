# App setup: from empty repo to a live "coming soon" page

The plan for step 3 of the build (an empty app that goes all the way to a
live site). It follows decisions 0002 and 0003; if 0003 changes, this
changes with it.

Status (12 Oct 2026): pull request 1 merged and live on Vercel. Pull
requests 2 to 11 are open, each built on the one before; merge them in
order.

## Your to-do list, in order

Everything Claude can't do for you. Each step says where it's explained
below.

1. **Merge the pull requests in order**, #2 first. Wait for each to show
   green ticks after the previous one is merged.
2. **Vercel → Settings → Environment Variables** (pull request 3): add
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   from Supabase → Project Settings → API, for Production and Preview.
   Redeploy.
3. **GitHub → Settings → Secrets → Actions** (pull request 3):
   `SUPABASE_ACCESS_TOKEN`, `SUPABASE_STAGING_PROJECT_REF`,
   `SUPABASE_STAGING_DB_PASSWORD`. Then merged migrations reach the
   database automatically.
4. **Supabase → Authentication** (pull request 4): set the site URL and
   redirect URLs, turn on TOTP, and add yourself as a Toran admin with the
   SQL given there. Set up the email provider (SMTP) before the pilot.
5. **Sentry** (pull request 5): sign up, then add `NEXT_PUBLIC_SENTRY_DSN`
   in Vercel.
6. **Watch** the GitHub repo so uptime and Dependabot emails reach you.
7. **Skim the mandir list** (pull request 7) and try the pages on your
   phone (pull requests 8 and 9).
8. **Read the legal drafts** (pull request 11) before showing Toran to
   anyone outside the pilot committees.

---

## Before we start (you, about 30 minutes)

1. **GitHub organisation.** On github.com: your profile picture → Your
   organizations → New organization → Free plan. Name it after the company
   (for example `Toran-com`). Add your partner as an owner.
2. **New repo** in that organisation: name `Toran-Main-Code`, private, with a README.
   Do not add a .gitignore or licence; the setup creates them.
3. **Give Claude access.** Go to https://claude.ai/connect-github and install
   the Claude GitHub App on the new organisation (choose "only selected
   repositories" → `Toran-Main-Code`).
4. **Accounts, all signed up with a company email, not personal ones:**
   - Supabase (database and login): create `toran-staging` now, region
     London; create `toran-prod` nearer launch (free projects pause after a
     week without use)
   - Vercel (hosting): connect it to the GitHub organisation, but import
     the project only after pull request 1 is merged. The free Hobby plan is
     for non-commercial use; move to a Pro team (about $20 a month) before
     the pilot launch
   - Sentry (error alerts): free plan
5. Tell Claude: "the repo is Toran-com/Toran-Main-Code". Claude attaches it to this
   session and does the rest.

Never paste passwords or secret keys into the chat. Supabase and Vercel
keys go straight into Vercel's settings; Claude will say exactly which ones.

---

## What Claude builds (about a week of evenings, in pull requests)

### Pull request 1 — the skeleton

```
Toran-Main-Code/
├── app/                    Next.js app (App Router, TypeScript)
│   ├── (public)/           public site: what's on, festivals, digest signup
│   ├── (mandir)/           mandir admin area, behind login
│   ├── (ops)/              Toran admin area, behind login + second factor
│   ├── api/                webhooks (email, WhatsApp later)
│   └── page.tsx            "Toran — coming soon"
├── lib/                    shared code: database client, dates, festivals
├── supabase/
│   ├── migrations/         every database change, numbered, in order
│   └── seed.sql            mandir list and festival dates for a fresh database
├── jobs/                   scheduled work: crawler, digest, reminders
├── tests/                  unit tests (Vitest) and browser tests (Playwright)
├── docs/                   moved from the research repo, decisions included
├── .github/workflows/      automatic checks
├── .env.example            names of every setting, no values
└── README.md               how to run it locally in five commands
```

Tools fixed in this pull request:

| Job             | Tool                                                       |
| --------------- | ---------------------------------------------------------- |
| Language        | TypeScript, strict mode                                    |
| Framework       | Next.js                                                    |
| Styling         | Tailwind CSS, with the colours and type from the prototype |
| Code style      | ESLint and Prettier, run automatically                     |
| Unit tests      | Vitest                                                     |
| Browser tests   | Playwright                                                 |
| Database        | Supabase (Postgres), migrations via the Supabase CLI       |
| Package manager | pnpm                                                       |
| Node version    | pinned in `.nvmrc`                                         |

### Pull request 2 — automatic checks

A GitHub Actions workflow (`.github/workflows/checks.yml`, check name
**Checks**) runs on every pull request and every change to `main`: install,
formatting, lint, type check, unit tests, build, and the browser tests on a
phone-sized screen. It takes about three minutes. If the browser tests fail,
their report is kept for a week under the run's Artifacts.

**Making a failing check block the merge.** GitHub only enforces this on a
private repo with a paid plan (GitHub Team, per user per month; check
github.com/pricing). On the free plan the red cross still shows on the pull
request, so the rule until then is: never merge a pull request that isn't
green. To turn enforcement on once the organisation is on Team:

1. Repo → Settings → Rules → Rulesets → New ruleset → New branch ruleset.
2. Name `Protect main`, Enforcement status **Active**, Target branches
   **Include default branch**.
3. Tick **Restrict deletions**, **Require a pull request before merging**,
   **Require status checks to pass** (add **Checks** and **Vercel**), and
   **Block force pushes**. Save.

Free-plan limits that matter: 2,000 GitHub Actions minutes a month for
private repos, which is roughly 600 runs of this workflow.

### Pull request 3 — the database and three copies of the site

| Copy    | Where                          | Database                                    | When it updates              |
| ------- | ------------------------------ | ------------------------------------------- | ---------------------------- |
| Local   | Your laptop                    | Local Supabase in Docker                    | When you run it              |
| Preview | A Vercel link per pull request | `toran-staging`                             | Every push to a pull request |
| Live    | toran-main-code.vercel.app     | `toran-staging` now, `toran-prod` at launch | Every merge to main          |

What it adds: the `supabase/` folder with the first migration (a `health()`
function), the Supabase client, `/api/health` (200 when the database
answers, 503 when it doesn't or isn't connected), and the **Database**
workflow. Migrations are checked on a fresh database in every pull request
and applied to `toran-staging` on merge (decision 0009).

**Your part, once (about 15 minutes):**

1. **Vercel → project → Settings → Environment Variables.** Add, for both
   **Production** and **Preview**, from Supabase → `toran-staging` →
   Project Settings → API Keys / Data API:
   - `NEXT_PUBLIC_SUPABASE_URL`: the Project URL, `https://<ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the publishable key
     (`sb_publishable_…`; older projects call it the anon key)

   Then Deployments → latest → Redeploy, so the site picks them up.

2. **GitHub → repo → Settings → Secrets and variables → Actions → New
   repository secret.** Add three:
   - `SUPABASE_ACCESS_TOKEN`: Supabase → your avatar → Account → Access
     Tokens → Generate new token (name it `github-toran`)
   - `SUPABASE_STAGING_PROJECT_REF`: the `<ref>` part of the Project URL
   - `SUPABASE_STAGING_DB_PASSWORD`: the database password you saved when
     creating the project
3. Check: after the next merge, the **Database** workflow's "Apply
   migrations" step goes green, and `/api/health` on the live site shows
   `"database":"ok"`.

At launch, create `toran-prod`, add `SUPABASE_PRODUCTION_PROJECT_REF` and
`SUPABASE_PRODUCTION_DB_PASSWORD`, run the Database workflow by hand with
target `production`, and point Vercel's **Production** variables at it.

### Pull request 4 — login and roles

What it adds: login by emailed link (`/login`), the link handler
(`/auth/confirm`), `/account`, log out, and the Toran admin area (`/ops`),
which also needs an authenticator app (decision 0010). Database:
`toran_admins` and `is_toran_admin()`, with pgTAP tests. GitHub runs the
whole login flow, including the authenticator step, against a real local
Supabase on every pull request (the **Login flow** job).

The rule that a mandir admin can only change their own mandir arrives with
the mandirs table in pull request 6.

**Your part, once (about 10 minutes), in Supabase → `toran-staging`:**

1. **Authentication → URL Configuration.**
   - Site URL: `https://toran-main-code.vercel.app`
   - Redirect URLs, add three: `https://toran-main-code.vercel.app/**`,
     `https://*-toran4.vercel.app/**` (preview links) and
     `http://localhost:3000/**`
2. **Authentication → Multi-Factor** (or Sign In / Providers → MFA): make
   sure **TOTP (authenticator app)** is enabled.
3. Log in once at `/login` with your email, then make yourself an admin in
   **SQL Editor**:

   ```sql
   insert into public.toran_admins (user_id, note)
   select id, 'Milan' from auth.users where email = 'you@example.com';
   ```

   Then open `/ops` and set up your authenticator app.

4. Before the pilot: **Authentication → Emails → SMTP Settings**, connect a
   proper email sender (Resend or Postmark). The built-in sender only sends
   a few emails an hour and isn't meant for real use.

### Pull request 5 — error alerts and uptime

What it adds: Sentry error reporting (inactive until its key is set; never
sends personal data: no cookies, headers, IP or user details, and email
addresses are scrubbed from messages), a friendly error page and a branded
"page not found", `/api/debug/error` (a deliberate error for testing Sentry
on preview links and your computer; 404 on the live site), and the hourly
**Uptime** workflow.

**Uptime:** checks `https://toran-main-code.vercel.app/api/health` every
hour. If it fails, it opens a GitHub issue labelled "site down" (GitHub
emails you) and closes it when the site recovers. "Database not configured"
isn't treated as an outage. It starts once this is merged to `main`. When
the real domain exists, set it in GitHub → Settings → Secrets and variables
→ Actions → **Variables** → `SITE_URL`. Make sure you **Watch** the repo
(top right on GitHub) so issue emails reach you.

**Sentry, your part (about 10 minutes, any time):**

1. Sign up at sentry.io (free plan), create a project, platform **Next.js**,
   name `toran`. Choose the EU data region if offered.
2. Copy the **DSN** (Settings → Projects → toran → Client Keys).
3. Vercel → Settings → Environment Variables: add
   `NEXT_PUBLIC_SENTRY_DSN` for Production and Preview, then redeploy.
4. Sentry → Settings → Security & Privacy: turn on **Prevent Storing of IP
   Addresses**; keep **Data Scrubber** on.
5. Test: open `/api/debug/error` on a preview link; the error should appear
   in Sentry within a minute.

### Pull request 6 — the data model

What it adds: the database tables for mandirs, their committees and
claims, festivals and their dates, events, sources, and seva rotas, with
security rules on every table. See `docs/data-model.md`. Nothing for you
to do.

### Pull request 7 — the mandir list and festival dates

What it adds: the 106 mandirs from your outreach and audit lists (no
duplicates, no emails or phone numbers), and the main festival dates for
2026-27, each marked _not yet checked_ with where it came from.

**Your part (when you have 20 minutes):** skim `supabase/data/mandirs.csv`
for anything wrong (a name, a town, a website). Tell Claude and it will fix
the list. Later, the festival dates get checked against a London panchang
(a Toran admin ticks them off).

### Pull request 8 — the first public pages

What it adds: `/mandirs` (every mandir by region and town, with a search
box), a page for each mandir (details, directions, upcoming events, or a
friendly "no events yet"), and `/festivals` (upcoming dates by month,
marked "Date not yet checked" until checked). The home page links to both.

Until launch, every page asks search engines not to list it
(`launched: false` in `lib/site.ts`). Pages are built ahead of time from
the database and refreshed hourly, so they stay fast and cheap.

**Your part:** once #3's database settings are in Vercel, open
`/mandirs` on the preview link and click around on your phone.

### Pull request 9 — mandir committees look after their page

What it adds:

1. **Claim:** on any mandir's page, "Look after this page" → log in → say
   your role at the mandir → send.
2. **Approve:** claims appear on `/ops` (Toran admins, after the
   authenticator code) with the person's email, their role, and the
   mandir's public phone and website. **Check with the mandir first**,
   usually by phoning them, then press Approve. Let the person know by
   email yourself for now.
3. **Manage:** approved committee members find their mandir under "Your
   mandirs" on `/account`. Adding an event takes three fields (what, date,
   start time). Each event has "Still on", "Cancel" and "Remove" buttons.
   Changes show on the public page straight away.

Removed events are only hidden: they stay in the database, in case one is
removed by mistake (ask Claude to restore it).

### Pull request 10 — housekeeping

What it adds: Dependabot, which opens a pull request each week when
packages have updates (grouped, so usually one) and each month for GitHub
Actions. Merge them when their checks are green; anything bigger (a new
major version) gets a separate pull request and is worth asking Claude
about. Also a refreshed README listing every page built so far.

### Map positions (after the mandir details are merged)

Once, on `/ops` (after your authenticator code), press **Fill in map
positions**. It looks up each mandir's postcode on postcodes.io and saves
the map position, which "near you" and distances need. It only fills
mandirs without a position, so it's safe to press again after adding
mandirs.

Postcode positions come from the ONS Postcode Directory. Pages that show
distances must say: "Contains OS data © Crown copyright and database right;
contains Royal Mail data © Royal Mail copyright and database right; source:
Office for National Statistics, licensed under the Open Government Licence
v3.0." The "near you" pages will include this.

### Done when

- The "coming soon" page is live on a real URL
- A change made in a pull request shows on its own preview link
- A failing test blocks the merge
- You can log in by email link on the live site
- A deliberate test error shows up in Sentry
- The README gets a new person running it locally in under 15 minutes

---

## After this

Next in the build (docs/architecture.md): what's on near you (events
across mandirs by date and distance), the weekly digest, forwarding
posters by WhatsApp or email into the review queue, and the seva rota.
The digest and rota sign-ups hold the public's personal data, so they
wait for ICO registration and the DPIA (decision 0006; drafts in
`docs/legal/`).
