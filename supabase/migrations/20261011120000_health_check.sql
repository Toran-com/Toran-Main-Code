-- Health check: lets the app and the uptime monitor confirm the database
-- answers, without reading any table. Callable by anyone, returns 'ok'.
create or replace function public.health()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select 'ok'::text;
$$;

comment on function public.health() is
  'Returns ok. Used by /api/health to check the database is reachable.';

revoke all on function public.health() from public;
grant execute on function public.health() to anon, authenticated, service_role;
