# Toran

What's on at mandirs near you, and a simple seva rota for mandir committees.

## Run it on your computer

You need Node 22 and pnpm (`corepack enable` turns pnpm on).

```bash
pnpm install                 # get the packages
cp .env.example .env.local   # settings; empty values are fine for now
pnpm dev                     # open http://localhost:3000
```

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

## Layout

| Folder          | What lives there                                                    |
| --------------- | ------------------------------------------------------------------- |
| `app/(public)/` | The public site: what's on, festivals, digest signup                |
| `app/(mandir)/` | The mandir admin area, behind login                                 |
| `app/(ops)/`    | The Toran admin area, behind login and a second factor              |
| `app/api/`      | Webhooks for incoming email and WhatsApp                            |
| `lib/`          | Shared code                                                         |
| `db/`           | Database migrations and seed data                                   |
| `jobs/`         | Scheduled work: crawler, digest, reminders                          |
| `tests/`        | Unit tests (`unit/`, Vitest) and browser tests (`e2e/`, Playwright) |
| `docs/`         | The technical plan, setup steps and decision records                |

Folders in brackets group pages without adding to the web address, so
`app/(public)/page.tsx` is the home page at `/`.

## How we work

- Every change on a branch, through a pull request. `main` is what is live.
- Anything hard to reverse gets a decision record in `docs/decisions/` first.
- Secrets never go in the repo; they live in Vercel and Supabase settings.

See `docs/architecture.md` for the plan and `docs/app-setup.md` for where
setup has got to.
