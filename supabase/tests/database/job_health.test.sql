-- What /api/health learns about the nightly and weekly jobs: only when
-- they last ran and whether they went right, for anyone to ask.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is(public.job_health(), '{"nightly": null, "weekly": null}'::jsonb,
  'before any run, it says so');
select throws_ok('select * from public.job_runs', '42501', null,
  'visitors still can''t read the job runs themselves');

reset role;
insert into public.job_runs (job, ran_at, summary) values
  ('nightly', now() - interval '3 days', '{"retention": {"invites": 1}}'),
  ('nightly', now() - interval '2 hours', '{"retention": null, "websites": {"checked": 3}}'),
  ('weekly', now() - interval '1 day', '{"sent": 40, "failed": 2}');

set local role anon;
select is((public.job_health() -> 'nightly' ->> 'ran_at')::timestamptz > now() - interval '3 hours', true,
  'it gives the latest nightly run');
select is(public.job_health() -> 'nightly' -> 'cleanup_ok', 'false'::jsonb,
  'and whether its clean-up worked');
select is((public.job_health() -> 'weekly' ->> 'failed')::int, 2,
  'and how many weekly emails failed');
select is((select count(*)::int from jsonb_object_keys(public.job_health() -> 'nightly')), 2,
  'and nothing else');

select * from finish();
rollback;
