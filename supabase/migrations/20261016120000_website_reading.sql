-- Better reading of mandirs' websites (lib/website-events.ts), and fixes for
-- what the first version got wrong.

-- What each website check read and, when it found nothing, why: shown to
-- Toran's admins on /ops/websites.
alter table public.sources
  add column last_notes text check (length(last_notes) <= 1000);

comment on column public.sources.last_notes is
  'Plain-English notes from the last website check: what was read, and why nothing was found if so.';

-- "Confirmed by the mandir" must mean the mandir's own committee. A Toran
-- admin helping out on a committee's page publishes without confirming.
-- Changes made outside the app (nobody signed in) are left as they are.
create or replace function public.stamp_event_confirmation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and not public.is_mandir_admin(new.mandir_id) then
    if tg_op = 'INSERT' then
      new.confirmed_at := null;
    elsif new.confirmed_at is distinct from old.confirmed_at
          and new.confirmed_at is not null then
      new.confirmed_at := old.confirmed_at;
    end if;
  end if;

  if tg_op = 'INSERT' then
    if new.confirmed_at is not null then
      new.confirmed_by := (select auth.uid());
    end if;
  elsif new.confirmed_at is distinct from old.confirmed_at then
    new.confirmed_by := case when new.confirmed_at is null then null else (select auth.uid()) end;
  else
    new.confirmed_by := old.confirmed_by;
  end if;
  return new;
end;
$$;

-- Tidying what the first website checks saved -------------------------------

-- Plain text from website HTML: escape sequences, encoded tags, tags and
-- the common entities, with spaces tidied. Only for this migration.
create function pg_temp.plain(value text)
returns text
language sql
immutable
as $$
  select nullif(trim(regexp_replace(regexp_replace(
    replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
      value, '\n', ' '), '\r', ' '), '&lt;', '<'), '&gt;', '>'), '&quot;', '"'),
      '&#039;', ''''), '&#8217;', '’'), '&#8211;', '–'), '&nbsp;', ' '), '&amp;', '&'),
    '<[^>]*>', ' ', 'g'), '\s+', ' ', 'g')), '')
$$;

-- Descriptions with HTML or "\n" left in.
update public.events
set summary = pg_temp.plain(summary)
where origin in ('website', 'poster', 'visitor')
  and summary ~ '(<[a-z/]|&[a-z#0-9]+;|\\n)';

-- Website events saved at midnight meant "no time given": all day instead.
update public.events
set all_day = true
where origin = 'website'
  and not all_day
  and to_char(starts_at at time zone 'Europe/London', 'HH24:MI') = '00:00';

-- Events from websites, posters and visitors marked confirmed by someone
-- who isn't on that mandir's committee.
update public.events e
set confirmed_at = null
where e.confirmed_at is not null
  and e.origin in ('website', 'poster', 'visitor')
  and not exists (
    select 1 from public.mandir_admins a
    where a.mandir_id = e.mandir_id and a.user_id = e.confirmed_by
  );

-- Website events still waiting in the queue.
update public.event_claims
set proposed = proposed
  || jsonb_build_object(
       'title', coalesce(pg_temp.plain(proposed ->> 'title'), proposed ->> 'title'),
       'summary', coalesce(pg_temp.plain(proposed ->> 'summary'), ''))
  || case when proposed ->> 'time' = '00:00' then '{"time": ""}'::jsonb else '{}'::jsonb end
where status = 'pending'
  and proposed ->> 'from' = 'website';
