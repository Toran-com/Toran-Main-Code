# Backups and the restore drill

A backup only counts once it has been restored. This page says what is
backed up, and how to practise getting it back: once now, then every three
months and before launch.

## What needs backing up

| What                                    | Where it lives                          | Can it be rebuilt?                                            |
| --------------------------------------- | --------------------------------------- | ------------------------------------------------------------- |
| The code, migrations and starting data  | GitHub                                  | Yes, GitHub is the copy                                       |
| Mandirs, events, festival dates, rotas  | Supabase database                       | **No**: committees' own changes and events exist only here    |
| Logins and who looks after which mandir | Supabase database (`auth` and `public`) | **No**, and it is personal data (committee members' emails)   |
| Settings (keys, URLs)                   | Vercel, Supabase and GitHub settings    | Yes, by following `docs/app-setup.md`; keys can be made again |

So the thing to protect is the **Supabase database**.

## Supabase's own backups

In Supabase → the project → **Database → Backups** you can see what your plan
includes. Paid plans keep a daily backup for several days and can restore it
with one button. **The free plan has no backups you can restore**, so until
the project is on a paid plan, the dump below is the only backup.

Before launch, decide with your partner whether to move `toran-prod` to a
paid plan. Daily backups are the main reason to.

## Making a backup by hand (about 10 minutes)

You need the database connection string from Supabase → **Connect** →
"Session pooler", with the database password. Keep both out of chat, email
and GitHub.

On your own computer (with [Supabase's command-line tool][cli] installed):

```bash
# Paste the connection string when asked, so it isn't saved in your history.
read -s DB_URL
supabase db dump --db-url "$DB_URL" -f roles.sql --role-only
supabase db dump --db-url "$DB_URL" -f schema.sql
supabase db dump --db-url "$DB_URL" -f data.sql --use-copy --data-only
```

The three files hold personal data (committee members' email addresses), so:

- keep them in an **encrypted** place (for example an encrypted disk image or
  a password-protected archive), never in GitHub, email or a shared drive;
- delete old ones: keep the last three;
- note the date in the drill log below.

[cli]: https://supabase.com/docs/guides/local-development/cli/getting-started

## The restore drill (about 30 minutes, every three months)

The point is to prove a backup works, **without touching the live
database**. Restore into a new, empty Supabase project, check it, delete it.

1. Make a fresh backup as above.
2. In Supabase, create a new project called `toran-restore-drill` (same
   region). Copy its Session pooler connection string as `NEW_DB_URL`.
3. Restore:

   ```bash
   read -s NEW_DB_URL
   psql --single-transaction --variable ON_ERROR_STOP=1 \
     --file roles.sql --file schema.sql \
     --command 'SET session_replication_role = replica' \
     --file data.sql \
     --dbname "$NEW_DB_URL"
   ```

4. Check it, in the new project's SQL editor. The numbers should match the
   same queries run on the live project:

   ```sql
   select count(*) from public.mandirs;            -- about 106 or more
   select count(*) from public.events;
   select count(*) from public.mandir_admins;
   select count(*) from auth.users;
   select max(created_at) from public.events;      -- should be recent
   ```

5. Optional: point a local copy of the app at it (its URL and publishable
   key in `.env.local`) and open a mandir page.
6. **Delete `toran-restore-drill`** (Settings → General → Delete project).
   It holds personal data and must not be left lying around.
7. Write the date and result in the log below, in a pull request.

If any step fails, that is the drill working: fix the steps on this page
before you need them for real.

## If the live database is lost or damaged

1. Don't panic, and don't change anything else yet.
2. Paid plan: Database → Backups → restore the most recent good day.
   Free plan: create a new project, restore the latest dump into it (step 3
   above), run any migrations made since the dump (`supabase db push`), then
   point Vercel's `NEXT_PUBLIC_SUPABASE_URL` and key at the new project and
   redeploy.
3. Anything committees changed since the backup is lost. Tell them, and ask
   them to check their pages.
4. If personal data may have been exposed (not just lost), the ICO must be
   told within 72 hours: see `docs/legal/`.

## Drill log

| Date | Backup from | Restored into | Counts matched? | By  | Notes |
| ---- | ----------- | ------------- | --------------- | --- | ----- |
|      |             |               |                 |     |       |
