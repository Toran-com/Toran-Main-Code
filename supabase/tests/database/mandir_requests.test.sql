-- Requests to a committee (decision 0025): what a mandir offers is
-- limited, and only the site's server code can look up where a request
-- goes: the committee's emails, for a claimed mandir that takes requests.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'chair@example.com'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'treasurer@example.com');
insert into public.mandirs (id, slug, name, town, region, status, request_types) values
  ('20000000-0000-0000-0000-000000000001', 'takes-requests', 'Takes Requests', 'Harrow', 'London', 'claimed', '{"Satyanarayan katha","Hall hire"}'),
  ('20000000-0000-0000-0000-000000000002', 'no-requests', 'No Requests', 'Harrow', 'London', 'claimed', '{}'),
  ('20000000-0000-0000-0000-000000000003', 'not-claimed', 'Not Claimed', 'Harrow', 'London', 'listed', '{"Havan"}');
insert into public.mandir_admins (mandir_id, user_id) values
  ('20000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000001');

select throws_ok(
  $$update public.mandirs set request_types = '{a1,a2,a3,a4,a5,a6,a7,a8,a9}' where slug = 'takes-requests'$$,
  '23514', null, 'at most eight things to ask for');
select is(
  (select request_types from public.mandirs where slug = 'no-requests'), '{}'::text[],
  'a mandir takes no requests until its committee says so');

-- Visitors and people logged in can't see the committee's emails ---------------------------------
set local role anon;
select throws_ok($$select * from public.request_recipients('takes-requests')$$, '42501', null,
  'visitors can''t look up where a request goes');
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok($$select * from public.request_recipients('takes-requests')$$, '42501', null,
  'nor can someone logged in, even on the committee');
reset role;

-- The site's server code -------------------------------------------------------------------------
set local role service_role;
select results_eq(
  $$select email from public.request_recipients('takes-requests') order by email$$,
  $$values ('chair@example.com'), ('treasurer@example.com')$$,
  'a request goes to every committee member');
select is((select count(*)::int from public.request_recipients('no-requests')), 0,
  'nowhere, for a mandir that takes no requests');
select is((select count(*)::int from public.request_recipients('not-claimed')), 0,
  'nowhere, for a mandir with no committee on Toran');
select is((select count(*)::int from public.request_recipients('nowhere')), 0,
  'nowhere, for a mandir that isn''t there');
reset role;

select * from finish();
rollback;
