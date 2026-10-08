# App setup: from empty repo to a live "coming soon" page

The plan for step 3 of the build (an empty app that goes all the way to a
live site). It follows decisions 0002 and 0003; if 0003 changes, this
changes with it.

Status: ready to run once the company's GitHub organisation and repo exist.

---

## Before we start (you, about 30 minutes)

1. **GitHub organisation.** On github.com: your profile picture → Your
   organizations → New organization → Free plan. Name it after the company
   (for example `utsav-ltd`). Add your partner as an owner.
2. **New repo** in that organisation: name `utsav`, private, with a README.
   Do not add a .gitignore or licence; the setup creates them.
3. **Give Claude access.** Go to https://claude.ai/connect-github and install
   the Claude GitHub App on the new organisation (choose "only selected
   repositories" → `utsav`).
4. **Accounts, all signed up with a company email, not personal ones:**
   - Supabase (database and login): create two projects, `utsav-staging`
     and `utsav-prod`, region London (eu-west-2)
   - Vercel (hosting): connect it to the GitHub organisation
   - Sentry (error alerts): free plan
5. Tell Claude: "the repo is utsav-ltd/utsav". Claude attaches it to this
   session and does the rest.

Never paste passwords or secret keys into the chat. Supabase and Vercel
keys go straight into Vercel's settings; Claude will say exactly which ones.

---

## What Claude builds (about a week of evenings, in pull requests)

### Pull request 1 — the skeleton

```
utsav/
├── app/                    Next.js app (App Router, TypeScript)
│   ├── (public)/           public site: what's on, festivals, digest signup
│   ├── (mandir)/           mandir admin area, behind login
│   ├── (ops)/              Utsav admin area, behind login + second factor
│   ├── api/                webhooks (email, WhatsApp later)
│   └── page.tsx            "Utsav — coming soon"
├── lib/                    shared code: database client, dates, festivals
├── db/
│   ├── migrations/         every database change, numbered, in order
│   └── seed/               mandir list, festival dates
├── jobs/                   scheduled work: crawler, digest, reminders
├── tests/                  unit tests (Vitest) and browser tests (Playwright)
├── docs/                   moved from the research repo, decisions included
├── .github/workflows/      automatic checks
├── .env.example            names of every setting, no values
└── README.md               how to run it locally in five commands
```

Tools fixed in this pull request:

| Job | Tool |
| --- | --- |
| Language | TypeScript, strict mode |
| Framework | Next.js |
| Styling | Tailwind CSS, with the colours and type from the prototype |
| Code style | ESLint and Prettier, run automatically |
| Unit tests | Vitest |
| Browser tests | Playwright |
| Database | Supabase (Postgres), migrations via the Supabase CLI |
| Package manager | pnpm |
| Node version | pinned in `.nvmrc` |

### Pull request 2 — automatic checks

A GitHub Actions workflow that runs on every pull request and blocks merging
if anything fails: install, code style, type check, unit tests, build, and
one browser test that opens the home page. The main branch is protected:
changes only arrive through pull requests that pass.

### Pull request 3 — three copies of the site

| Copy | Where | Database | When it updates |
| --- | --- | --- | --- |
| Local | Your laptop | Local Supabase in Docker | When you run it |
| Preview | A Vercel link per pull request | `utsav-staging` | Every push to a pull request |
| Live | utsav domain (once bought) | `utsav-prod` | Every merge to main |

Database migrations run against staging first, then live, by a workflow,
never by hand.

### Pull request 4 — login and error alerts

- Login by emailed link (Supabase Auth), no passwords
- Three roles from the start: public, mandir admin, Utsav admin
- Database rules (row-level security) so a mandir admin can only change
  their own mandir, tested
- Sentry on the live and preview sites; an uptime check on the live site

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
