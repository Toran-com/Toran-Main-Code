-- "Correct or remove something" (/corrections): anyone can ask for a
-- mistake to be fixed, a mandir's page to be hidden, or personal details
-- to be taken down. The terms promise same-day removal, so open requests
-- are listed on /ops/attention until a Toran admin marks them done.
--
-- Nothing about the sender is kept (decision 0006): no name, email or IP
-- address, and the form asks people not to type any. To stop flooding,
-- at most 200 can be open at once.

create table public.site_requests (
  id bigint generated always as identity primary key,
  kind text not null
    check (kind in ('wrong', 'remove_mandir', 'personal', 'other')),
  -- The page it's about, as a path on the site ("/mandirs/x").
  page text not null check (page ~ '^/\S{0,199}$'),
  details text not null check (length(details) between 2 and 1000),
  created_at timestamptz not null default now(),
  done_at timestamptz
);

comment on table public.site_requests is
  'Requests to correct or remove something. No sender details. Deleted 90 days after being dealt with.';

create index site_requests_open_idx on public.site_requests (created_at)
  where done_at is null;

alter table public.site_requests enable row level security;
revoke all on public.site_requests from anon, authenticated;
grant select, update (done_at) on public.site_requests to authenticated;

create policy "Toran admins see requests" on public.site_requests
  for select to authenticated
  using (public.is_toran_admin());
create policy "Toran admins mark requests done" on public.site_requests
  for update to authenticated
  using (public.is_toran_admin())
  with check (public.is_toran_admin());

-- Sends a request. Anyone can, signed in or not.
create or replace function public.request_correction(kind text, page text, details text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(kind, '') not in ('wrong', 'remove_mandir', 'personal', 'other')
    or coalesce(page, '') !~ '^/\S{0,199}$'
    or coalesce(length(trim(details)), 0) not between 2 and 1000 then
    raise exception 'That request isn''t complete' using errcode = '22023';
  end if;
  if (select count(*) from public.site_requests where done_at is null) >= 200 then
    raise exception 'Too many requests are waiting' using errcode = '54000';
  end if;
  insert into public.site_requests (kind, page, details)
    values (kind, page, trim(details));
end;
$$;

revoke all on function public.request_correction(text, text, text) from public;
grant execute on function public.request_correction(text, text, text) to anon, authenticated;

-- /ops/attention lists the open requests too.
create or replace function public.needs_attention()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Europe/London')::date;
  most constant integer := 50;
begin
  if not public.is_toran_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  return jsonb_build_object(
    -- Published events in the next 30 days that the mandir hasn't confirmed
    -- in the last 30 (or ever).
    'unconfirmed', (
      select jsonb_build_object(
        'total', count(*),
        'items', coalesce(jsonb_agg(item order by rn) filter (where rn <= most), '[]'::jsonb))
      from (
        select row_number() over (order by n.next_at, e.title) as rn,
          jsonb_build_object(
            'id', e.id, 'title', e.title, 'next_at', n.next_at,
            'confirmed_at', e.confirmed_at,
            'slug', m.slug, 'name', m.name, 'town', m.town,
            'has_committee', exists (select 1 from public.mandir_admins a where a.mandir_id = m.id)
          ) as item
        from public.events e
        join public.mandirs m on m.id = e.mandir_id and m.status <> 'hidden'
        cross join lateral (
          select case
            when e.recurrence is null then case when e.starts_at >= now() then e.starts_at end
            else (select min(o.starts_at) from public.event_occurrences o
                  where o.event_id = e.id and not o.cancelled and o.starts_at >= now())
          end as next_at
        ) n
        where e.status = 'published'
          and n.next_at < now() + interval '30 days'
          and (e.confirmed_at is null or e.confirmed_at < now() - interval '30 days')
      ) x),

    -- Mandirs with a committee on Toran but nothing coming up.
    'quiet', (
      select jsonb_build_object(
        'total', count(*),
        'items', coalesce(jsonb_agg(item order by rn) filter (where rn <= most), '[]'::jsonb))
      from (
        select row_number() over (order by l.last_added nulls first, m.name) as rn,
          jsonb_build_object(
            'slug', m.slug, 'name', m.name, 'town', m.town,
            'last_added', l.last_added
          ) as item
        from public.mandirs m
        cross join lateral (
          select max(e.created_at) as last_added from public.events e
          where e.mandir_id = m.id and e.status <> 'removed'
        ) l
        where m.status <> 'hidden'
          and exists (select 1 from public.mandir_admins a where a.mandir_id = m.id)
          and not exists (
            select 1 from public.events e
            where e.mandir_id = m.id and e.status = 'published'
              and (
                (e.recurrence is null and e.starts_at >= now())
                or exists (select 1 from public.event_occurrences o
                           where o.event_id = e.id and not o.cancelled and o.starts_at >= now())
              )
          )
      ) x),

    -- Websites the checker couldn't read last time.
    'websites', (
      select jsonb_build_object(
        'total', count(*),
        'items', coalesce(jsonb_agg(item order by rn) filter (where rn <= most), '[]'::jsonb))
      from (
        select row_number() over (order by s.last_checked_at desc, m.name) as rn,
          jsonb_build_object(
            'slug', m.slug, 'name', m.name, 'town', m.town,
            'outcome', s.last_outcome, 'checked_at', s.last_checked_at,
            'notes', s.last_notes
          ) as item
        from public.sources s
        join public.mandirs m on m.id = s.mandir_id and m.status <> 'hidden'
        where s.kind = 'crawler' and s.last_outcome in ('blocked', 'unreachable')
      ) x),

    -- Committee invites that run out in the next 3 days.
    'invites', (
      select jsonb_build_object(
        'total', count(*),
        'items', coalesce(jsonb_agg(item order by rn) filter (where rn <= most), '[]'::jsonb))
      from (
        select row_number() over (order by i.expires_at) as rn,
          jsonb_build_object(
            'slug', m.slug, 'name', m.name, 'town', m.town,
            'expires_at', i.expires_at
          ) as item
        from public.mandir_invites i
        join public.mandirs m on m.id = i.mandir_id
        where i.expires_at > now() and i.expires_at < now() + interval '3 days'
      ) x),

    -- Festival dates in the next 60 days not yet checked against a panchang.
    'festival_dates', (
      select jsonb_build_object(
        'total', count(*),
        'items', coalesce(jsonb_agg(item order by rn) filter (where rn <= most), '[]'::jsonb))
      from (
        select row_number() over (order by d.starts_on, f.name) as rn,
          jsonb_build_object(
            'name', f.name, 'calendar', d.calendar, 'starts_on', d.starts_on
          ) as item
        from public.festival_dates d
        join public.festivals f on f.id = d.festival_id
        where not d.verified and d.starts_on between today and today + 60
      ) x),

    -- Mandirs with posters waiting more than 3 days, and how many.
    'posters', (
      select jsonb_build_object(
        'total', count(*),
        'items', coalesce(jsonb_agg(item order by rn) filter (where rn <= most), '[]'::jsonb))
      from (
        select row_number() over (order by min(c.created_at), m.name) as rn,
          jsonb_build_object(
            'slug', m.slug, 'name', m.name, 'town', m.town,
            'waiting', count(*), 'oldest', min(c.created_at),
            'has_committee', exists (select 1 from public.mandir_admins a where a.mandir_id = m.id)
          ) as item
        from public.event_claims c
        join public.mandirs m on m.id = c.mandir_id
        where c.status = 'pending' and c.created_at < now() - interval '3 days'
        group by m.id
      ) x),

    -- Requests to look after a mandir's page waiting more than 2 days.
    'claims', (
      select jsonb_build_object(
        'total', count(*),
        'items', coalesce(jsonb_agg(item order by rn) filter (where rn <= most), '[]'::jsonb))
      from (
        select row_number() over (order by c.created_at) as rn,
          jsonb_build_object(
            'slug', m.slug, 'name', m.name, 'town', m.town,
            'created_at', c.created_at
          ) as item
        from public.mandir_claims c
        join public.mandirs m on m.id = c.mandir_id
        where c.status = 'pending' and c.created_at < now() - interval '2 days'
      ) x),

    -- Requests to correct or remove something, oldest first. Same-day
    -- removal is promised, so every open one is listed.
    'requests', (
      select jsonb_build_object(
        'total', count(*),
        'items', coalesce(jsonb_agg(item order by rn) filter (where rn <= most), '[]'::jsonb))
      from (
        select row_number() over (order by r.created_at) as rn,
          jsonb_build_object(
            'id', r.id, 'kind', r.kind, 'page', r.page,
            'details', r.details, 'created_at', r.created_at
          ) as item
        from public.site_requests r
        where r.done_at is null
      ) x)
  );
end;
$$;

revoke all on function public.needs_attention() from public, anon;
grant execute on function public.needs_attention() to authenticated;

-- The nightly clean-up deletes requests 90 days after they were dealt with.
-- Deletes what has passed its retention period, and says how many of
-- each. Only the nightly job calls it (as service_role).
create or replace function public.run_retention()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invites integer;
  approved integer;
  rejected integer;
  counts integer;
  runs integer;
  requests integer;
begin
  -- Invites run out after 14 days.
  delete from public.mandir_invites where expires_at < now();
  get diagnostics invites = row_count;

  -- Requests to look after a page: approved ones 2 years after the
  -- decision, turned-down ones 6 months after.
  delete from public.mandir_claims
    where status = 'approved' and decided_at < now() - interval '2 years';
  get diagnostics approved = row_count;
  delete from public.mandir_claims
    where status = 'rejected' and decided_at < now() - interval '6 months';
  get diagnostics rejected = row_count;

  -- Visit totals after 3 years.
  delete from public.daily_counts
    where day < (now() at time zone 'Europe/London')::date - interval '3 years';
  get diagnostics counts = row_count;

  -- This job's own log after 90 days.
  delete from public.job_runs where ran_at < now() - interval '90 days';
  get diagnostics runs = row_count;

  -- Correction and removal requests 90 days after they were dealt with.
  delete from public.site_requests where done_at < now() - interval '90 days';
  get diagnostics requests = row_count;

  return jsonb_build_object(
    'invites', invites,
    'approved_claims', approved,
    'rejected_claims', rejected,
    'daily_counts', counts,
    'job_runs', runs,
    'site_requests', requests
  );
end;
$$;

revoke all on function public.run_retention() from public, anon, authenticated;
grant execute on function public.run_retention() to service_role;
