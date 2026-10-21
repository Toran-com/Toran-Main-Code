-- "Correct or remove something": anyone can send a request; only Toran
-- admins can read it or mark it done; the nightly clean-up deletes it 90
-- days after it was dealt with.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (id, email) values
  ('cccccccc-0000-0000-0000-000000000003', 'c@example.com'),
  ('dddddddd-0000-0000-0000-000000000004', 'toran@example.com');
insert into public.toran_admins (user_id) values ('dddddddd-0000-0000-0000-000000000004');

-- Visitors --------------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select lives_ok(
  $$select public.request_correction('wrong', '/mandirs/mandir-one', 'The aarti is at 7pm, not 6pm.')$$,
  'a visitor can ask for a correction');
select lives_ok(
  $$select public.request_correction('remove_mandir', '/mandirs/mandir-one', 'We would rather not be listed.')$$,
  'or for a mandir''s page to be hidden');
select throws_ok(
  $$select public.request_correction('delete_everything', '/', 'Please')$$,
  '22023', null, 'not an unknown kind of request');
select throws_ok(
  $$select public.request_correction('wrong', 'https://example.org', 'Wrong')$$,
  '22023', null, 'not a page outside the site');
select throws_ok(
  $$select public.request_correction('wrong', '//example.org/page', 'Wrong')$$,
  '22023', null, 'nor a link to another site written as //');
select throws_ok(
  $$select public.request_correction('wrong', '/\example.org/page', 'Wrong')$$,
  '22023', null, 'or as /\');
select throws_ok(
  $$select public.request_correction('wrong', '/', ' ')$$,
  '22023', null, 'not without saying what''s wrong');
select throws_ok('select * from public.site_requests', '42501', null,
  'visitors cannot read requests');

-- Committee members can send but not read --------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is((select count(*)::int from public.site_requests), 0,
  'other signed-in people see none');

-- Toran admins -----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.site_requests), 2, 'Toran admins see them');
select is(
  (select jsonb_array_length(public.needs_attention() -> 'requests' -> 'items')), 2,
  'and both are on the Needs attention page');
update public.site_requests set done_at = now()
  where details = 'We would rather not be listed.';
select is((select (public.needs_attention() -> 'requests' ->> 'total')::int), 1,
  'a request marked done leaves the list');
select throws_ok(
  $$update public.site_requests set details = 'Changed'$$,
  '42501', null, 'but what was asked can''t be changed');

-- The nightly clean-up ------------------------------------------------------------------------
reset role;
update public.site_requests set done_at = now() - interval '91 days' where done_at is not null;
set local role service_role;
select is((select (public.run_retention() ->> 'site_requests')::int), 1,
  'requests go 90 days after they were dealt with');
reset role;
select is((select count(*)::int from public.site_requests), 1, 'open ones stay');

select * from finish();
rollback;
