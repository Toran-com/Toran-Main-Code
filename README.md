# Toran

What's on at mandirs near you, and a simple seva rota for mandir committees.

## Run it on your computer

You need Node 22 and pnpm (`corepack enable` turns pnpm on).

```bash
pnpm install                 # get the packages
cp .env.example .env.local   # settings; empty values are fine for now
pnpm dev                     # open http://localhost:3000
```

## What's built so far

| Address                 | What it is                                          |
| ----------------------- | --------------------------------------------------- |
| `/`                     | Coming soon, with links to the directory            |
| `/mandirs`              | Every mandir by region and town, with search        |
| `/mandirs/<name>`       | A mandir's details and what's on                    |
| `/mandirs/<name>/claim` | A committee member asks to look after the page      |
| `/whats-on`             | Every upcoming event, or those near a postcode      |
| `/festivals`            | Festival dates for the UK                           |
| `/festivals/<name>`     | One festival's dates and events at mandirs          |
| `/login`, `/account`    | Email-link login; your mandirs                      |
| `/manage/<name>`        | Add, confirm, cancel and remove a mandir's events   |
| `/ops`                  | Toran admin (second factor): claims, mandirs, dates |
| `/api/health`           | Health check used by the hourly uptime check        |

Until launch every page asks search engines not to list it (`launched` in
`lib/site.ts`).

## Checks

Every pull request must pass these before it can be merged. GitHub runs
them automatically on each pull request (the **Checks** workflow); run them
yourself first to catch problems early:

```bash
pnpm check      # formatting, lint, type check and unit tests
pnpm test:e2e   # builds the site and tests it in a phone-sized browser
```

`pnpm format` fixes formatting. The first time you run the browser tests,
`pnpm exec playwright install chromium` downloads the browser.

The **Database** workflow also starts a real local Supabase on GitHub. It
applies every migration, runs the database security tests
(`supabase/tests/database/`, pgTAP), checks `lib/database.types.ts` is up
to date, and runs the browser tests that need real logins and data
(`tests/e2e-auth/`). Locally that needs Docker; see `supabase/README.md`.

Both sets of browser tests check pages for accessibility (WCAG 2.2 AA, with
[axe](https://github.com/dequelabs/axe-core)) in light and dark mode:
public pages, a committee's pages and the admin area. A colour, label or
heading that fails stops the merge. `tests/a11y.ts` has the check.

They also keep to a **speed budget** (`tests/speed.ts`): at most 250 KB of
JavaScript and 350 KB in all per page, as sent over the network, because
many visitors are on older phones and mobile data.

Backups, and the restore drill to practise every three months, are in
`docs/backup-and-restore.md`.

Dependabot opens a pull request each week for package updates and each
month for GitHub Actions updates.

## Layout

| Folder          | What lives there                                                                 |
| --------------- | -------------------------------------------------------------------------------- |
| `app/(public)/` | The public site: mandirs, festivals, what's on, later the digest                 |
| `app/(mandir)/` | The mandir admin area, behind login                                              |
| `app/(ops)/`    | The Toran admin area, behind login and a second factor                           |
| `app/api/`      | Webhooks for incoming email and WhatsApp                                         |
| `lib/`          | Shared code                                                                      |
| `supabase/`     | Database migrations, seed data and local database settings                       |
| `components/`   | Shared page parts                                                                |
| `scripts/`      | One-off tools, e.g. building the starting mandir list                            |
| `jobs/`         | Scheduled work: crawler, digest, reminders (not built yet)                       |
| `tests/`        | Unit tests (`unit/`, Vitest) and browser tests (`e2e/`, `e2e-auth/`, Playwright) |
| `docs/`         | The technical plan, setup steps and decision records                             |

Folders in brackets group pages without adding to the web address, so
`app/(public)/page.tsx` is the home page at `/`.

## How we work

- Every change on a branch, through a pull request. `main` is what is live.
- Anything hard to reverse gets a decision record in `docs/decisions/` first.
- Secrets never go in the repo; they live in Vercel and Supabase settings.

See `docs/architecture.md` for the plan and `docs/app-setup.md` for where
setup has got to.
