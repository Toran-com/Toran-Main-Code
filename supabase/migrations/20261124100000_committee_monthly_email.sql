-- The monthly email to each mandir's committee (lib/committee-monthly.ts),
-- now that the ICO registration and DPIA are done: sent by the weekly job
-- once a month to each committee member who hasn't said stop.

-- Each committee member can stop it, for each mandir they help run.
alter table public.mandir_admins
  add column monthly_email boolean not null default true;

comment on column public.mandir_admins.monthly_email is
  'Whether this committee member gets the monthly email about this mandir. They can stop it from the email.';

-- Which mandirs' committees have had this month's email, so a run that
-- stops part way (or a second run) carries on without sending twice. No
-- personal data: the mandir and the month only.
create table public.committee_emails_sent (
  mandir_id uuid not null references public.mandirs (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  recipients integer not null check (recipients >= 0),
  sent_at timestamptz not null default now(),
  primary key (mandir_id, month)
);

comment on table public.committee_emails_sent is
  'Mandirs whose committee has had the monthly email, per month. No personal data.';

alter table public.committee_emails_sent enable row level security;
revoke all on public.committee_emails_sent from anon, authenticated;
grant select on public.committee_emails_sent to authenticated;
grant select, insert on public.committee_emails_sent to service_role;

create policy "Toran admins see which committees had the email"
  on public.committee_emails_sent for select to authenticated
  using (public.is_toran_admin());

-- The counter's totals for a mandir's pages since a day, and what its page
-- brings, without the checks: called only by the functions below, which
-- check who's asking first.
create or replace function public.mandir_count_paths(base text, since date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('path', path, 'metric', metric, 'count', total)), '[]'::jsonb)
  from (
    select path, metric, sum(count)::int as total
    from public.daily_counts
    where day >= since and (path = base or starts_with(path, base || '/'))
    group by path, metric
  ) p;
$$;

revoke all on function public.mandir_count_paths(text, date) from public, anon, authenticated;

create or replace function public.mandir_supporters_of(target uuid, base text, since date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'followers', greatest(0, coalesce(sum(case c.metric
        when 'follow' then c.count when 'unfollow' then -c.count end)
        filter (where c.path = base), 0))::int,
    'new_followers', coalesce(sum(case c.metric
        when 'follow' then c.count when 'unfollow' then -c.count end)
        filter (where c.path = base and c.day >= since), 0)::int,
    'asks', coalesce(sum(c.count)
        filter (where c.path = base and c.metric = 'ask'), 0)::int,
    'new_asks', coalesce(sum(c.count)
        filter (where c.path = base and c.metric = 'ask' and c.day >= since), 0)::int,
    'went', coalesce(sum(c.count)
        filter (where starts_with(c.path, base || '/events/')
          and c.metric = 'went' and c.day >= since), 0)::int,
    'seva_taken', (
      select count(*)::int from public.seva_slots s
        join public.seva_shifts sh on sh.id = s.shift_id
        join public.seva_roles r on r.id = sh.role_id
        where r.mandir_id = target
          and s.created_at >= (since::timestamp at time zone 'Europe/London'))
  )
  from public.daily_counts c
  where c.metric in ('follow', 'unfollow', 'ask', 'went')
    and (c.path = base or starts_with(c.path, base || '/events/'));
$$;

revoke all on function public.mandir_supporters_of(uuid, text, date) from public, anon, authenticated;

-- mandir_supporters (decision 0022), now using the shared sum.
create or replace function public.mandir_supporters(target uuid, since date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  base text;
begin
  if not (public.is_mandir_admin(target) or public.is_toran_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select '/mandirs/' || m.slug into base from public.mandirs m where m.id = target;
  if base is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  return public.mandir_supporters_of(target, base, since);
end;
$$;

-- This month's emails still to send, for the weekly job only (it runs as
-- service_role): each mandir with a committee whose first member joined
-- at least two weeks ago and hasn't had this month's email, with the
-- members who still want it, how many members it has, its counter totals
-- since a day, and what its page brings.
create or replace function public.committee_emails_due(for_month text, since date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'mandir', jsonb_build_object(
        'id', m.id, 'slug', m.slug, 'name', m.name, 'town', m.town,
        'calendar', m.calendar, 'postcode', m.postcode,
        'website', m.website, 'phone', m.phone),
      'recipients', (
        select coalesce(jsonb_agg(jsonb_build_object('user_id', a.user_id, 'email', u.email)
            order by a.added_at), '[]'::jsonb)
        from public.mandir_admins a
        join auth.users u on u.id = a.user_id
        where a.mandir_id = m.id and a.monthly_email and u.email is not null),
      'members', (select count(*) from public.mandir_admins a where a.mandir_id = m.id),
      'paths', public.mandir_count_paths('/mandirs/' || m.slug, since),
      'supporters', public.mandir_supporters_of(m.id, '/mandirs/' || m.slug, since)
    ) order by m.name), '[]'::jsonb)
  from public.mandirs m
  where m.status = 'claimed'
    and not exists (
      select 1 from public.committee_emails_sent s
      where s.mandir_id = m.id and s.month = for_month)
    and (select min(a.added_at) from public.mandir_admins a where a.mandir_id = m.id)
        <= now() - interval '14 days';
$$;

revoke all on function public.committee_emails_due(text, date) from public, anon, authenticated;
grant execute on function public.committee_emails_due(text, date) to service_role;

-- Stopping (or restarting) the email from its link, for the site's own
-- code only (the link is signed, lib/committee-monthly-send.ts).
create or replace function public.set_committee_email(member uuid, target uuid, wanted boolean)
returns boolean
language sql
security definer
set search_path = ''
as $$
  update public.mandir_admins set monthly_email = wanted
  where user_id = member and mandir_id = target
  returning true;
$$;

revoke all on function public.set_committee_email(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_committee_email(uuid, uuid, boolean) to service_role;

-- The monthly email's runs are kept with the other jobs'.
alter table public.job_runs drop constraint job_runs_job_check;
alter table public.job_runs
  add constraint job_runs_job_check check (job in ('nightly', 'weekly', 'committee-email'));
