-- Notices from a mandir's committee to visitors: "Closed today because of
-- the snow", "Aarti at 7pm tonight, not 6:30". A line of text and the
-- last day it applies (at most a month ahead), shown on the mandir's page
-- and its events' pages until then. At most three at once. No personal
-- data: not even who posted it.

create table public.mandir_notices (
  id uuid primary key default gen_random_uuid(),
  mandir_id uuid not null references public.mandirs (id) on delete cascade,
  body text not null check (length(trim(body)) between 3 and 200),
  until_on date not null,
  created_at timestamptz not null default now()
);

create index mandir_notices_mandir_idx on public.mandir_notices (mandir_id, until_on);

comment on table public.mandir_notices is
  'Short notices from a mandir''s committee to visitors, shown until their last day. No personal data.';

alter table public.mandir_notices enable row level security;
grant select on public.mandir_notices to anon, authenticated;
grant insert, delete on public.mandir_notices to authenticated;

-- Anyone sees the current notices of a mandir they can see.
create policy "See current notices" on public.mandir_notices
  for select to anon, authenticated
  using (
    until_on >= (now() at time zone 'Europe/London')::date
    and exists (select 1 from public.mandirs m where m.id = mandir_id)
  );

-- Its committee (and Toran admins) see them all, and add and remove them.
create policy "Committees see their notices" on public.mandir_notices
  for select to authenticated
  using (public.is_mandir_admin(mandir_id) or public.is_toran_admin());

create policy "Committees post notices" on public.mandir_notices
  for insert to authenticated
  with check (
    (public.is_mandir_admin(mandir_id) or public.is_toran_admin())
    and until_on between (now() at time zone 'Europe/London')::date
      and (now() at time zone 'Europe/London')::date + 31
  );

create policy "Committees remove notices" on public.mandir_notices
  for delete to authenticated
  using (public.is_mandir_admin(mandir_id) or public.is_toran_admin());

-- At most three current notices per mandir; and old ones (ended over a
-- month ago) are cleared away as a new one is added.
create or replace function public.mandir_notice_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Europe/London')::date;
begin
  -- Someone not on the committee: the row rules refuse it, after this.
  if not (public.is_mandir_admin(new.mandir_id) or public.is_toran_admin()) then
    return new;
  end if;
  delete from public.mandir_notices
    where mandir_id = new.mandir_id and until_on < today - 30;
  if (select count(*) from public.mandir_notices
        where mandir_id = new.mandir_id and until_on >= today) >= 3 then
    raise exception 'Three notices at once is the most' using errcode = '23514';
  end if;
  new.body := trim(new.body);
  return new;
end;
$$;

revoke all on function public.mandir_notice_limit() from public, anon, authenticated;

create trigger mandir_notices_limit
  before insert on public.mandir_notices
  for each row execute function public.mandir_notice_limit();
