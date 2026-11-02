-- When the nightly and weekly jobs last ran, for /api/health, so the
-- hourly uptime check can say when one has stopped. Only times and
-- whether it went right: nothing about any person, and nothing that
-- isn't already on Toran's own status pages.
create function public.job_health()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'nightly', (
      select jsonb_build_object(
        'ran_at', r.ran_at,
        'cleanup_ok', jsonb_typeof(r.summary -> 'retention') = 'object')
      from public.job_runs r
      where r.job = 'nightly'
      order by r.ran_at desc
      limit 1),
    'weekly', (
      select jsonb_build_object(
        'ran_at', r.ran_at,
        'failed', coalesce((r.summary ->> 'failed')::int, 0))
      from public.job_runs r
      where r.job = 'weekly'
      order by r.ran_at desc
      limit 1)
  );
$$;

comment on function public.job_health() is
  'When the nightly and weekly jobs last ran and whether they went right. Used by /api/health.';

revoke all on function public.job_health() from public;
grant execute on function public.job_health() to anon, authenticated, service_role;
