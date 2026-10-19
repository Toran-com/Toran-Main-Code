-- What needs a Toran admin's attention, for /ops/attention: events coming up
-- that nobody has confirmed lately, committees with nothing coming up,
-- websites the checker can't read, invites about to run out, festival dates
-- not yet checked, and posters and committee requests left waiting. Worked
-- out in the database, so no row limit applies. Each list says how many
-- there are in all and gives the first 50. Invites give only the mandir and
-- when they run out, never the colleague's email address.
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
      ) x)
  );
end;
$$;

revoke all on function public.needs_attention() from public, anon;
grant execute on function public.needs_attention() to authenticated;
