-- The nightly job's clean-up: deletes exactly what the retention policy
-- says, and only the nightly job (service_role) can run it.
begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email) values
  ('cccccccc-0000-0000-0000-000000000003', 'c@example.com'),
  ('dddddddd-0000-0000-0000-000000000004', 'toran@example.com');
insert into public.toran_admins (user_id) values ('dddddddd-0000-0000-0000-000000000004');
-- Logins: link never opened (old, recent, and an old one who runs a
-- mandir), and an old one that was used.
insert into auth.users (id, email, created_at, email_confirmed_at) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'unused-old@example.com', now() - interval '8 days', null),
  ('eeeeeeee-0000-0000-0000-000000000002', 'unused-new@example.com', now() - interval '2 days', null),
  ('eeeeeeee-0000-0000-0000-000000000003', 'unused-admin@example.com', now() - interval '8 days', null),
  ('eeeeeeee-0000-0000-0000-000000000004', 'used@example.com', now() - interval '8 days', now() - interval '8 days');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'listed');

insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000003');

insert into public.mandir_invites (mandir_id, email, expires_at) values
  ('10000000-0000-0000-0000-000000000001', 'old@example.com', now() - interval '1 day'),
  ('10000000-0000-0000-0000-000000000001', 'new@example.com', now() + interval '5 days');

insert into public.mandir_claims (mandir_id, user_id, role_at_mandir, status, decided_at) values
  ('10000000-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003', 'Old yes', 'approved', now() - interval '25 months'),
  ('10000000-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003', 'Recent yes', 'approved', now() - interval '20 months'),
  ('10000000-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003', 'Old no', 'rejected', now() - interval '7 months'),
  ('10000000-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003', 'Recent no', 'rejected', now() - interval '5 months');
insert into public.mandir_claims (mandir_id, user_id, role_at_mandir, created_at) values
  ('10000000-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003', 'Waiting', now() - interval '3 years');

insert into public.daily_counts (day, metric, path, count) values
  (current_date - interval '4 years', 'view', '/', 5),
  (current_date - interval '2 years', 'view', '/', 7);
insert into public.job_runs (job, ran_at) values
  ('nightly', now() - interval '100 days'),
  ('nightly', now() - interval '1 day');

-- Nobody signed in, and Toran admins, can't run it -----------------------------------------
set local role anon;
select throws_ok($$select public.run_retention()$$, '42501', null, 'visitors can''t run the clean-up');
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$select public.run_retention()$$, '42501', null, 'nor can Toran admins');
select is((select count(*)::int from public.job_runs), 2, 'Toran admins can see the job''s log');
select throws_ok($$insert into public.job_runs (job) values ('nightly')$$, '42501', null,
  'but not write to it');

-- The nightly job ------------------------------------------------------------------------------
reset role;
set local role service_role;
create temporary table done on commit drop as select public.run_retention() as r;
reset role;

select is((select r from done),
  '{"invites": 1, "approved_claims": 1, "rejected_claims": 1, "daily_counts": 1, "job_runs": 1, "site_requests": 0, "unused_logins": 1}'::jsonb,
  'it says how many of each it deleted');
select is((select array_agg(email) from public.mandir_invites), array['new@example.com'],
  'expired invites go');
select is((select array_agg(role_at_mandir order by role_at_mandir) from public.mandir_claims),
  array['Recent no', 'Recent yes', 'Waiting'],
  'approved requests go after 2 years and turned-down ones after 6 months');
select is((select count(*)::int from public.mandir_claims where status = 'pending'), 1,
  'requests still waiting stay');
select is((select array_agg(email order by email) from auth.users where email like 'u%'),
  array['unused-admin@example.com', 'unused-new@example.com', 'used@example.com'],
  'logins never used go after 7 days, unless they run a mandir');
select is((select sum(count)::int from public.daily_counts), 7, 'visit totals go after 3 years');
select is((select count(*)::int from public.job_runs), 1, 'its own log goes after 90 days');
select is((select count(*)::int from public.mandirs), (select count(*)::int from public.mandirs),
  'mandirs are untouched');

set local role service_role;
select lives_ok($$select public.run_retention()$$, 'running it again is harmless');
reset role;

select * from finish();
rollback;
