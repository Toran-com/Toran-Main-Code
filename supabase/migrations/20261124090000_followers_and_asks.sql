-- Followers and asks (decision 0022): the counter (decision 0015) also adds
-- up, per mandir, presses of Follow and Unfollow, of "Ask them to post on
-- Toran", and of "I went" on its events. Still totals per page per day,
-- with nothing about who pressed: who follows whom stays on their phone.
-- A committee sees its own totals, and how many seva places were taken
-- on Toran, so it can see what its page brings.

alter table public.daily_counts drop constraint daily_counts_metric_check;
alter table public.daily_counts add constraint daily_counts_metric_check
  check (metric in ('view', 'calendar', 'subscribe', 'share', 'follow', 'unfollow', 'ask', 'went'));

comment on table public.daily_counts is
  'Visits per public page per day, calendar adds, shares, and presses of Follow, Unfollow, Ask and I went. Totals only, nothing about visitors.';

-- As before, plus: Follow, Unfollow and Ask count on a mandir's own page
-- only, and I went on an event's page only.
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
  if what is null
     or what not in ('view', 'calendar', 'subscribe', 'share', 'follow', 'unfollow', 'ask', 'went')
     or page is null or length(page) > 200 or page !~ '^/[a-z0-9/-]*$' then
    return;
  end if;
  if what in ('follow', 'unfollow', 'ask') and page !~ '^/mandirs/[a-z0-9-]+$' then
    return;
  end if;
  if what = 'went' and page !~ '^/mandirs/[a-z0-9-]+/events/[0-9a-f-]+$' then
    return;
  end if;

  ok := case
    when page ~ '^/(whats-on|seva|mandirs|festivals|for-mandirs|demo)?$' then true
    when page ~ '^/(maha-shivaratri|holi|ram-navami|janmashtami|ganesh-chaturthi|navratri|diwali)$' then true
    -- A season in a town (/diwali/leicester): a listed mandir must be in
    -- that town, its name made into an address as lib/towns.ts does.
    when page ~ '^/(maha-shivaratri|holi|ram-navami|janmashtami|ganesh-chaturthi|navratri|diwali)/[a-z0-9-]+$' then
      exists (
        select 1 from public.mandirs m
        where m.status <> 'hidden'
          and trim(both '-' from regexp_replace(
                regexp_replace(lower(replace(m.town, '&', ' and ')), '[''’]', '', 'g'),
                '[^a-z0-9]+', '-', 'g')) = parts[3]
      )
    when page = '/for-mandirs/guide' then true
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

-- What a mandir's page brings, for its committee and Toran admins:
-- followers (all the Follows less the Unfollows, ever) and those gained in
-- the period; asks to post (ever, and in the period); I went presses on
-- its events in the period; and seva places taken on Toran in the period.
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
  return (
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
      and (c.path = base or starts_with(c.path, base || '/events/'))
  );
end;
$$;

revoke all on function public.mandir_supporters(uuid, date) from public, anon;
grant execute on function public.mandir_supporters(uuid, date) to authenticated;

-- For Toran admins planning visits: each mandir's followers and asks to
-- post, ever, most asked first. Mandirs nobody has followed or asked for
-- aren't listed.
create or replace function public.supporters_by_mandir()
returns table (slug text, name text, town text, status text, followers int, asks int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_toran_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
    select m.slug, m.name, m.town, m.status::text,
      greatest(0, coalesce(sum(case c.metric
        when 'follow' then c.count when 'unfollow' then -c.count end), 0))::int,
      coalesce(sum(c.count) filter (where c.metric = 'ask'), 0)::int
    from public.daily_counts c
    join public.mandirs m on c.path = '/mandirs/' || m.slug
    where c.metric in ('follow', 'unfollow', 'ask')
    group by m.slug, m.name, m.town, m.status
    order by 6 desc, 5 desc, m.name;
end;
$$;

revoke all on function public.supporters_by_mandir() from public, anon;
grant execute on function public.supporters_by_mandir() to authenticated;
