-- A mandir's own events calendar (Google Calendar, Outlook or any .ics
-- address), pasted in by its committee or Toran. The nightly job reads it
-- and puts new events in the review queue, like the website check.
-- Private: Google's "secret address" works like a password, so only the
-- mandir's committee and Toran's admins can see it. The nightly job uses
-- the secret key, which passes these rules, and records how each read went.

create table public.mandir_calendars (
  mandir_id uuid primary key references public.mandirs (id) on delete cascade,
  url text not null
    check (url ~ '^https://[^[:space:]]+$' and char_length(url) <= 500),
  added_at timestamptz not null default now(),
  last_read_at timestamptz,
  last_outcome text
    check (last_outcome in ('found', 'none', 'blocked', 'unreachable')),
  last_found integer check (last_found >= 0),
  last_added integer check (last_added >= 0)
);

comment on table public.mandir_calendars is
  'Each mandir''s own events calendar address, read every night for new events. Private to its committee and Toran.';

alter table public.mandir_calendars enable row level security;
revoke all on public.mandir_calendars from anon, authenticated;
grant select, insert, update, delete on public.mandir_calendars to authenticated;

create policy "Committees and Toran see the calendar" on public.mandir_calendars
  for select to authenticated
  using (public.is_mandir_admin(mandir_id) or public.is_toran_admin());
create policy "Committees and Toran add the calendar" on public.mandir_calendars
  for insert to authenticated
  with check (public.is_mandir_admin(mandir_id) or public.is_toran_admin());
create policy "Committees and Toran change the calendar" on public.mandir_calendars
  for update to authenticated
  using (public.is_mandir_admin(mandir_id) or public.is_toran_admin())
  with check (public.is_mandir_admin(mandir_id) or public.is_toran_admin());
create policy "Committees and Toran remove the calendar" on public.mandir_calendars
  for delete to authenticated
  using (public.is_mandir_admin(mandir_id) or public.is_toran_admin());
