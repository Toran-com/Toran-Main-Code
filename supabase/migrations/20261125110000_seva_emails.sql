-- Seva emails to committees (decision 0029): one roundup each evening of
-- the places taken on Toran since the last one, and an email straight
-- away when a seva's places are all taken. No personal data is added:
-- seva places stay anonymous (decision 0013), so the emails only count.

-- Each committee member can stop the seva emails, for each mandir they
-- help run, from a signed link in the email.
alter table public.mandir_admins
  add column seva_email boolean not null default true;

comment on column public.mandir_admins.seva_email is
  'Whether this committee member gets the seva emails (evening roundup, seva full) about this mandir. They can stop them from the email.';

-- When the committee was told a seva's places were all taken, so they're
-- told once. Cleared when the committee adds places, so it can fill again.
alter table public.seva_roles
  add column full_emailed_at timestamptz;

comment on column public.seva_roles.full_emailed_at is
  'When the committee was emailed that every place in this seva was taken. Cleared when places are added.';

create or replace function public.seva_places_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.needed > old.needed then
    update public.seva_roles set full_emailed_at = null
      where id = new.role_id and full_emailed_at is not null;
  end if;
  return null;
end;
$$;

revoke all on function public.seva_places_added() from public, anon, authenticated;

create trigger seva_shifts_places_added
  after insert or update of needed on public.seva_shifts
  for each row execute function public.seva_places_added();

-- Each mandir's evening roundups: up to when it counted, and how many
-- places. No personal data.
create table public.seva_roundups_sent (
  mandir_id uuid not null references public.mandirs (id) on delete cascade,
  through timestamptz not null,
  places integer not null check (places >= 0),
  recipients integer not null check (recipients >= 0),
  sent_at timestamptz not null default now(),
  primary key (mandir_id, through)
);

comment on table public.seva_roundups_sent is
  'Mandirs whose committee has had the evening seva roundup, up to when. No personal data.';

alter table public.seva_roundups_sent enable row level security;
revoke all on public.seva_roundups_sent from anon, authenticated;
grant select on public.seva_roundups_sent to authenticated;
grant select, insert on public.seva_roundups_sent to service_role;

create policy "Toran admins see which committees had the roundup"
  on public.seva_roundups_sent for select to authenticated
  using (public.is_toran_admin());

-- A seva as the emails show it: its name, its event (if any), and each of
-- its times still to come with how many places are taken of how many.
create or replace function public.seva_role_summary(target uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id,
    'name', r.name,
    'event', case when e.id is null then null else jsonb_build_object(
      'id', e.id, 'title', e.title, 'starts_at', e.starts_at, 'all_day', e.all_day) end,
    'shifts', (
      select coalesce(jsonb_agg(jsonb_build_object(
          'starts_at', sh.starts_at, 'ends_at', sh.ends_at,
          'needed', sh.needed,
          'taken', least(sh.needed, sh.filled_offline + sh.taken_online))
          order by sh.starts_at), '[]'::jsonb)
      from public.seva_shifts sh
      where sh.role_id = r.id and sh.ends_at > now()))
  from public.seva_roles r
  left join public.events e on e.id = r.event_id
  where r.id = target;
$$;

revoke all on function public.seva_role_summary(uuid) from public, anon, authenticated;

-- The committee members who want seva emails about a mandir.
create or replace function public.seva_email_recipients(target uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('user_id', a.user_id, 'email', u.email)
      order by a.added_at), '[]'::jsonb)
  from public.mandir_admins a
  join auth.users u on u.id = a.user_id
  where a.mandir_id = target and a.seva_email and u.email is not null;
$$;

revoke all on function public.seva_email_recipients(uuid) from public, anon, authenticated;

-- The evening roundups still to send, for the daily job only (it runs as
-- service_role): each claimed mandir with places taken on Toran since its
-- last roundup (or the last day), with its committee members who want
-- them, and each seva that had places taken, how many, and how it stands.
create or replace function public.seva_roundups_due(until timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with windows as (
    select m.id, m.slug, m.name, m.town,
      coalesce(
        (select max(s.through) from public.seva_roundups_sent s where s.mandir_id = m.id),
        until - interval '1 day') as since
    from public.mandirs m
    where m.status = 'claimed'
  ),
  taken as (
    select w.id as mandir_id, r.id as role_id, count(*)::int as places
    from windows w
    join public.seva_roles r on r.mandir_id = w.id
    join public.seva_shifts sh on sh.role_id = r.id
    join public.seva_slots sl on sl.shift_id = sh.id
    where sl.created_at > w.since and sl.created_at <= until
    group by w.id, r.id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'mandir', jsonb_build_object('id', w.id, 'slug', w.slug, 'name', w.name, 'town', w.town),
      'since', w.since,
      'recipients', public.seva_email_recipients(w.id),
      'seva', (
        select jsonb_agg(public.seva_role_summary(t.role_id) || jsonb_build_object('new', t.places)
          order by t.places desc)
        from taken t where t.mandir_id = w.id)
    ) order by w.name), '[]'::jsonb)
  from windows w
  where exists (select 1 from taken t where t.mandir_id = w.id);
$$;

revoke all on function public.seva_roundups_due(timestamptz) from public, anon, authenticated;
grant execute on function public.seva_roundups_due(timestamptz) to service_role;

-- Just after a place is taken: if every place still to come in that seva
-- is now taken, and the committee hasn't been told, marks it told and
-- answers what to tell them. Otherwise null. For the site's own code only.
create or replace function public.seva_full_notice(target_shift uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role uuid;
  mandir record;
begin
  select r.id into target_role
    from public.seva_shifts sh
    join public.seva_roles r on r.id = sh.role_id
    where sh.id = target_shift;
  if target_role is null then
    return null;
  end if;
  if exists (
    select 1 from public.seva_shifts sh
      where sh.role_id = target_role
        and sh.ends_at > now()
        and sh.filled_offline + sh.taken_online < sh.needed
  ) then
    return null;
  end if;
  update public.seva_roles r set full_emailed_at = now()
    where r.id = target_role and r.full_emailed_at is null;
  if not found then
    return null;
  end if;
  select m.id, m.slug, m.name, m.town into mandir
    from public.seva_roles r join public.mandirs m on m.id = r.mandir_id
    where r.id = target_role and m.status = 'claimed';
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'mandir', jsonb_build_object('id', mandir.id, 'slug', mandir.slug, 'name', mandir.name, 'town', mandir.town),
    'recipients', public.seva_email_recipients(mandir.id),
    'seva', public.seva_role_summary(target_role));
end;
$$;

revoke all on function public.seva_full_notice(uuid) from public, anon, authenticated;
grant execute on function public.seva_full_notice(uuid) to service_role;

-- Stopping (or restarting) the seva emails from their link, for the site's
-- own code only (the link is signed, lib/committee-monthly-send.ts).
create or replace function public.set_seva_email(member uuid, target uuid, wanted boolean)
returns boolean
language sql
security definer
set search_path = ''
as $$
  update public.mandir_admins set seva_email = wanted
  where user_id = member and mandir_id = target
  returning true;
$$;

revoke all on function public.set_seva_email(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_seva_email(uuid, uuid, boolean) to service_role;

-- The roundup's runs are kept with the other jobs'.
alter table public.job_runs drop constraint job_runs_job_check;
alter table public.job_runs
  add constraint job_runs_job_check
  check (job in ('nightly', 'weekly', 'committee-email', 'push', 'seva-roundup'));
