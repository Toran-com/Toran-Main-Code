# App setup: from empty repo to a live "coming soon" page

The plan for step 3 of the build (an empty app that goes all the way to a
live site). It follows decisions 0002 and 0003; if 0003 changes, this
changes with it.

Status: in progress. Pull request 1 merged and live on Vercel (8 Oct 2026); pull request 2 ready to merge; pull request 3 under way (11 Oct).

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

- Sentry on the live and preview sites; switches on when its key is added
- An hourly check of `/api/health` that flags failures

### Done when

- The "coming soon" page is live on a real URL
- A change made in a pull request shows on its own preview link
- A failing test blocks the merge
- You can log in by email link on the live site
- A deliberate test error shows up in Sentry
- The README gets a new person running it locally in under 15 minutes

---

## After this

Step 4 of the build: the data model as migrations, seeded with the 91 UK
mandirs from `outreach/mandirs_uk.csv` and the 30 from `audit/mandirs.csv`,
with tests for repeating events and festival dates. See
`docs/architecture.md`, section 2.
