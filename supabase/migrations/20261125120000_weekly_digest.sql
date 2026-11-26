-- The weekly email to committees (decision 0030), which replaces the
-- monthly one (decision 0023): last week's numbers, drawn as charts, with
-- the week before to compare. Sent on Monday mornings by its own job.

-- It's the same "email about my mandir's page" each member can stop: the
-- column keeps its name, so everyone who stopped the monthly email stays
-- stopped.
comment on column public.mandir_admins.monthly_email is
  'Whether this committee member gets the weekly email about this mandir (it was monthly until decision 0030). They can stop it from the email.';

-- Which committees have had each week's email ("2026-W48"), alongside the
-- monthly ones already sent ("2026-11").
alter table public.committee_emails_sent
  drop constraint committee_emails_sent_month_check;
alter table public.committee_emails_sent
  add constraint committee_emails_sent_month_check
  check (month ~ '^\d{4}-(\d{2}|W\d{2})$');

comment on table public.committee_emails_sent is
  'Mandirs whose committee has had the weekly email, per week (or the monthly one, per month, before decision 0030). No personal data.';

-- A mandir's counts since a day, per day and per page, without the
-- checks: called only by the function below.
create or replace function public.mandir_count_summary_of(base text, since date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'days', coalesce((
      select jsonb_agg(jsonb_build_object('day', day, 'metric', metric, 'count', total) order by day)
      from (
        select day, metric, sum(count)::int as total
        from public.daily_counts
        where day >= since and (path = base or starts_with(path, base || '/'))
        group by day, metric
      ) d), '[]'::jsonb),
    'paths', coalesce((
      select jsonb_agg(jsonb_build_object('path', path, 'metric', metric, 'count', total))
      from (
        select path, metric, sum(count)::int as total
        from public.daily_counts
        where day >= since and (path = base or starts_with(path, base || '/'))
        group by path, metric
      ) p), '[]'::jsonb));
$$;

revoke all on function public.mandir_count_summary_of(text, date) from public, anon, authenticated;

-- This week's emails still to send, for the digest job only (it runs as
-- service_role): each mandir with a committee whose first member joined
-- at least a week ago and hasn't had this week's email, with the members
-- who still want it, how many members it has, its counts per day and page
-- for this week and the one before, and what its page brought this week
-- and over both.
create or replace function public.committee_digests_due(for_week text, week_start date)
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
      'counts', public.mandir_count_summary_of('/mandirs/' || m.slug, week_start - 7),
      'week_paths', public.mandir_count_paths('/mandirs/' || m.slug, week_start),
      'supporters', public.mandir_supporters_of(m.id, '/mandirs/' || m.slug, week_start),
      'supporters_both', public.mandir_supporters_of(m.id, '/mandirs/' || m.slug, week_start - 7)
    ) order by m.name), '[]'::jsonb)
  from public.mandirs m
  where m.status = 'claimed'
    and not exists (
      select 1 from public.committee_emails_sent s
      where s.mandir_id = m.id and s.month = for_week)
    and (select min(a.added_at) from public.mandir_admins a where a.mandir_id = m.id)
        <= now() - interval '7 days';
$$;

revoke all on function public.committee_digests_due(text, date) from public, anon, authenticated;
grant execute on function public.committee_digests_due(text, date) to service_role;

-- The monthly email's list is no longer used.
drop function public.committee_emails_due(text, date);

-- The digest's runs are kept with the other jobs'.
alter table public.job_runs drop constraint job_runs_job_check;
alter table public.job_runs
  add constraint job_runs_job_check
  check (job in ('nightly', 'weekly', 'committee-email', 'push', 'seva-roundup', 'committee-digest'));
