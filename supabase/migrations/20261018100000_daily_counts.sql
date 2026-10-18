-- Toran's own visit counter (decision 0015): per day, how many times each
-- public page was seen, and how often events were added to calendars,
-- calendars subscribed to, or pages shared. Running totals only: nothing
-- about who visited (no IP address, browser, device or cookie).

create table public.daily_counts (
  day date not null default (now() at time zone 'Europe/London')::date,
  metric text not null check (metric in ('view', 'calendar', 'subscribe', 'share')),
  path text not null check (length(path) <= 200 and path ~ '^/[a-z0-9/-]*$'),
  count integer not null default 0 check (count >= 0),
  primary key (day, metric, path)
);

comment on table public.daily_counts is
  'Visits per public page per day, and calendar adds and shares. Totals only, nothing about visitors.';

alter table public.daily_counts enable row level security;
revoke all on public.daily_counts from anon, authenticated;
grant select on public.daily_counts to authenticated;

create policy "Toran admins see the counts" on public.daily_counts
  for select to authenticated
  using (public.is_toran_admin());

-- Adds one to today's count for a page. Anyone can call it (the site does,
-- for each visit). Only real public pages are counted: a mandir, event or
-- festival in the address must exist, so made-up addresses add nothing.
create or replace function public.count_visit(what text, page text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  parts text[] := string_to_array(page, '/');
  ok boolean;
begin
  if what is null or what not in ('view', 'calendar', 'subscribe', 'share')
     or page is null or length(page) > 200 or page !~ '^/[a-z0-9/-]*$' then
    return;
  end if;

  ok := case
    when page ~ '^/(whats-on|mandirs|festivals|for-mandirs|demo)?$' then true
    when page ~ '^/mandirs/[a-z0-9-]+$' then
      exists (select 1 from public.mandirs m where m.slug = parts[3] and m.status <> 'hidden')
    when page ~ '^/mandirs/[a-z0-9-]+/events/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(/seva)?$' then
      exists (
        select 1 from public.events e
          join public.mandirs m on m.id = e.mandir_id
          where e.id = parts[5]::uuid and m.slug = parts[3]
            and e.status in ('published', 'cancelled')
      )
    when page ~ '^/festivals/[a-z0-9-]+$' then
      exists (select 1 from public.festivals f where f.slug = parts[3])
    else false
  end;
  if not ok then
    return;
  end if;

  insert into public.daily_counts as c (metric, path, count)
    values (what, page, 1)
    on conflict (day, metric, path) do update set count = c.count + 1;
end;
$$;

revoke all on function public.count_visit(text, text) from public;
grant execute on function public.count_visit(text, text) to anon, authenticated;

-- The totals for /ops/stats since a day, added up in the database (so no
-- row limit applies): per day and metric, and per page and metric.
create or replace function public.daily_count_summary(since date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_toran_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'days', coalesce((
      select jsonb_agg(jsonb_build_object('day', day, 'metric', metric, 'count', total) order by day)
      from (
        select day, metric, sum(count)::int as total
        from public.daily_counts where day >= since group by day, metric
      ) d), '[]'::jsonb),
    'paths', coalesce((
      select jsonb_agg(jsonb_build_object('path', path, 'metric', metric, 'count', total))
      from (
        select path, metric, sum(count)::int as total
        from public.daily_counts where day >= since group by path, metric
      ) p), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.daily_count_summary(date) from public, anon;
grant execute on function public.daily_count_summary(date) to authenticated;
