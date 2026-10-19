-- Count visits to the committee guide (/for-mandirs/guide) too. Same as
-- before otherwise. The handout to print isn't counted.
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
    when page ~ '^/(whats-on|mandirs|festivals|for-mandirs|demo|diwali)?$' then true
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
