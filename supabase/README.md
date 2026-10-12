# Database

Supabase (Postgres). Every change to the database is a numbered SQL file in
`migrations/`, applied in order. Never change the live database by hand
(decision 0009).

- `config.toml` — settings for the local Supabase stack
- `migrations/` — one file per change, named `YYYYMMDDHHMMSS_what_it_does.sql`
- `seed.sql` — data loaded into a fresh local database (added with the mandir
  list in a later pull request)

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

## How changes reach the real database

1. A pull request adds a migration. The **Database** check starts a fresh
   Supabase on GitHub, applies every migration and runs the database linter.
2. When the pull request is merged to `main`, the **Database** workflow
   applies new migrations to `toran-staging`.
3. Once `toran-prod` exists, the same workflow is run by hand to apply them
   to the live database.
