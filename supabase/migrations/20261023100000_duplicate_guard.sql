-- Keeping one copy of each event. The app compares events by day, time and
-- name, allowing for spelling (lib/duplicates.ts), and asks a person when
-- it's unsure; this is the database's part:
--
-- 1. distinct_events remembers when a person has said two look-alike
--    events are different, so nobody is asked about them again.
-- 2. A safety net refuses a second event at the same mandir on the same
--    day, with the same name, at the same time (or either all day), however
--    it was added. Spelling differences are the app's job.
-- 3. fill_event_gaps and merge_events fold one copy into the other: the
--    one kept gains anything only the other had (a time, a description, a
--    link), and the other is removed.
-- 4. report_event no longer queues a visitor's report of an event that's
--    already listed or already waiting.

-- 1. Look-alikes a person has said are different ---------------------------

create table public.distinct_events (
  first_id uuid not null references public.events (id) on delete cascade,
  second_id uuid not null references public.events (id) on delete cascade,
  decided_by uuid default auth.uid() references auth.users (id) on delete set null,
  decided_at timestamptz not null default now(),
  primary key (first_id, second_id),
  check (first_id < second_id)
);

comment on table public.distinct_events is
  'Pairs of look-alike events a person has said are different (the smaller id first).';

alter table public.distinct_events enable row level security;
revoke all on public.distinct_events from anon, authenticated;
grant select, insert on public.distinct_events to authenticated;

-- Whoever looks after both events (they're at the same mandir) may see and
-- record the decision.
create or replace function public.may_decide_events(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events x join public.events y
      on y.id = b and y.mandir_id = x.mandir_id
    where x.id = a
      and (public.is_toran_admin() or public.is_mandir_admin(x.mandir_id))
  );
$$;
revoke all on function public.may_decide_events(uuid, uuid) from public;
grant execute on function public.may_decide_events(uuid, uuid) to authenticated;

create policy "Mandir admins and Toran admins see decisions" on public.distinct_events
  for select to authenticated
  using (public.may_decide_events(first_id, second_id));
create policy "Mandir admins and Toran admins record decisions" on public.distinct_events
  for insert to authenticated
  with check (public.may_decide_events(first_id, second_id));

-- 2. The safety net ---------------------------------------------------------

-- An event's name with only its letters and digits, lower case.
create or replace function public.event_title_key(title text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(lower(coalesce(title, '')), '[^a-z0-9]+', '', 'g');
$$;

-- The day a moment falls on in the UK.
create or replace function public.london_day(at timestamptz)
returns date
language sql
immutable
set search_path = ''
as $$
  select (at at time zone 'Europe/London')::date;
$$;

create index events_mandir_day_idx
  on public.events (mandir_id, public.london_day(starts_at));

create or replace function public.refuse_duplicate_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  other uuid;
begin
  if new.status = 'removed' then
    return new;
  end if;
  select e.id into other
    from public.events e
    where e.mandir_id = new.mandir_id
      and e.id <> new.id
      and e.status <> 'removed'
      and public.london_day(e.starts_at) = public.london_day(new.starts_at)
      and public.event_title_key(e.title) = public.event_title_key(new.title)
      and (e.starts_at = new.starts_at or e.all_day or new.all_day)
      and not exists (
        select 1 from public.distinct_events d
        where d.first_id = least(e.id, new.id)
          and d.second_id = greatest(e.id, new.id)
      )
    limit 1;
  if other is not null then
    raise exception 'This event is already listed'
      using errcode = '23505', hint = other::text;
  end if;
  return new;
end;
$$;

create trigger events_refuse_duplicate
  before insert or update of title, starts_at, all_day, mandir_id, status
  on public.events
  for each row execute function public.refuse_duplicate_event();

-- 3. Folding one copy into another -------------------------------------------

-- Adds to an event what it doesn't say yet: a description, the Gujarati,
-- a link, a kind, and a start time when it only had a day (a one-off event
-- only; a repeating event keeps its dates). Never changes what it already
-- says. Row-level security decides who may.
create or replace function public.fill_event_gaps(target uuid, details jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  d jsonb := coalesce(details, '{}'::jsonb);
  e public.events;
  later timestamptz;
begin
  select * into e from public.events where id = target for update;
  if e.id is null then
    raise exception 'No such event' using errcode = 'P0002';
  end if;
  if e.all_day and e.recurrence is null
    and coalesce((d ->> 'all_day')::boolean, true) = false
    and d ? 'starts_at'
    and public.london_day((d ->> 'starts_at')::timestamptz) = public.london_day(e.starts_at) then
    later := (d ->> 'starts_at')::timestamptz;
  end if;
  update public.events set
    summary = coalesce(nullif(summary, ''), nullif(trim(d ->> 'summary'), '')),
    title_gu = coalesce(nullif(title_gu, ''), nullif(trim(d ->> 'title_gu'), '')),
    summary_gu = coalesce(nullif(summary_gu, ''), nullif(trim(d ->> 'summary_gu'), '')),
    link = coalesce(link, nullif(d ->> 'link', '')),
    kind = case when kind = 'other' and coalesce(d ->> 'kind', 'other') in
        ('festival', 'aarti', 'bhajan', 'katha', 'class', 'seva', 'youth', 'community')
      then d ->> 'kind' else kind end,
    starts_at = coalesce(later, starts_at),
    all_day = case when later is null then all_day else false end
  where id = target;
end;
$$;
revoke all on function public.fill_event_gaps(uuid, jsonb) from public;
grant execute on function public.fill_event_gaps(uuid, jsonb) to authenticated;

-- Keeps one of two copies of an event: it gains what only the other said,
-- the other is removed, and anything that pointed at the other (claims
-- from the review queue) points at the one kept. Both must be at the same
-- mandir, and the one removed mustn't have a seva rota, which a person
-- moves by hand. Row-level security decides who may.
create or replace function public.merge_events(keep uuid, other uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  k public.events;
  o public.events;
begin
  select * into k from public.events where id = keep;
  select * into o from public.events where id = other;
  if k.id is null or o.id is null or k.id = o.id or k.mandir_id <> o.mandir_id then
    raise exception 'Those aren''t two events at one mandir' using errcode = '22023';
  end if;
  if exists (select 1 from public.seva_roles where event_id = other) then
    raise exception 'That event has a seva rota' using errcode = '55000';
  end if;
  update public.events set status = 'removed' where id = other;
  perform public.fill_event_gaps(keep, jsonb_build_object(
    'summary', o.summary,
    'title_gu', o.title_gu,
    'summary_gu', o.summary_gu,
    'link', o.link,
    'kind', o.kind,
    'starts_at', o.starts_at,
    'all_day', o.all_day
  ));
  update public.event_claims set event_id = keep where event_id = other;
end;
$$;
revoke all on function public.merge_events(uuid, uuid) from public;
grant execute on function public.merge_events(uuid, uuid) to authenticated;

-- 4. Visitors' reports of events already known -------------------------------

create or replace function public.report_event(mandir_slug text, proposed jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
  source uuid;
  p jsonb := coalesce(proposed, '{}'::jsonb);
begin
  select id into target from public.mandirs
    where slug = mandir_slug and status <> 'hidden';
  if target is null then
    raise exception 'No such mandir' using errcode = 'P0002';
  end if;

  -- The same shape the app checks, checked again here because this can be
  -- called directly.
  if jsonb_typeof(p) <> 'object'
    or coalesce(length(trim(p ->> 'title')), 0) not between 2 and 120
    or coalesce(length(p ->> 'summary'), 0) > 280
    or coalesce(p ->> 'date', '') !~ '^\d{4}-\d{2}-\d{2}$'
    or coalesce(p ->> 'time', '') !~ '^(\d{2}:\d{2})?$'
    or coalesce(p ->> 'repeat', 'none') not in ('none', 'weekly', 'fortnightly', 'monthly', 'monthly-last')
    or coalesce(p ->> 'until', '') !~ '^(\d{4}-\d{2}-\d{2})?$'
    or coalesce(length(p ->> 'link'), 0) > 300
    or coalesce(p ->> 'link', '') !~ '^(https?://\S+)?$' then
    raise exception 'That report isn''t complete' using errcode = '22023';
  end if;

  -- Already listed, or already waiting to be checked: nothing to add. The
  -- visitor is thanked all the same.
  if exists (
      select 1 from public.events e
      where e.mandir_id = target and e.status <> 'removed'
        and public.london_day(e.starts_at) = (p ->> 'date')::date
        and public.event_title_key(e.title) = public.event_title_key(p ->> 'title'))
    or exists (
      select 1 from public.event_claims c
      where c.mandir_id = target and c.status in ('pending', 'accepted', 'rejected')
        and c.proposed ->> 'date' = p ->> 'date'
        and public.event_title_key(c.proposed ->> 'title') = public.event_title_key(p ->> 'title')) then
    return;
  end if;

  if (select count(*) from public.event_claims c
        join public.sources s on s.id = c.source_id
        where c.mandir_id = target and c.status = 'pending'
          and s.kind = 'public_report') >= 10
    or (select count(*) from public.event_claims c
        join public.sources s on s.id = c.source_id
        where c.status = 'pending' and s.kind = 'public_report') >= 300 then
    raise exception 'Too many reports are waiting to be checked'
      using errcode = '54000';
  end if;

  select id into source from public.sources
    where mandir_id = target and kind = 'public_report'
    order by created_at limit 1;
  if source is null then
    insert into public.sources (mandir_id, kind, label)
      values (target, 'public_report', 'Sent in by a visitor')
      returning id into source;
  end if;

  insert into public.event_claims (mandir_id, source_id, proposed, confidence)
    values (target, source, jsonb_build_object(
      'title', trim(p ->> 'title'),
      'date', p ->> 'date',
      'time', coalesce(p ->> 'time', ''),
      'summary', coalesce(p ->> 'summary', ''),
      'repeat', coalesce(p ->> 'repeat', 'none'),
      'until', coalesce(p ->> 'until', ''),
      'from', 'visitor',
      'link', coalesce(p ->> 'link', '')
    ), 0.4);
end;
$$;
revoke all on function public.report_event(text, jsonb) from public;
grant execute on function public.report_event(text, jsonb) to anon, authenticated;
