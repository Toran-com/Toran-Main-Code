-- A committee's own numbers (decision 0015): the counter's totals for its
-- mandir's page and its events' pages, for that mandir's committee (and
-- Toran admins) only. Totals per page per day, as on /ops/stats; nothing
-- about who visited.
create or replace function public.mandir_count_summary(target uuid, since date)
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
  return jsonb_build_object(
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
      ) p), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.mandir_count_summary(uuid, date) from public, anon;
grant execute on function public.mandir_count_summary(uuid, date) to authenticated;
