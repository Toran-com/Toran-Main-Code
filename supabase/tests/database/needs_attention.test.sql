-- What needs a Toran admin's attention: only Toran admins can ask, and each
-- list holds what it should (and nothing it shouldn't).
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'committee@example.com'),
  ('cccccccc-0000-0000-0000-000000000003', 'c@example.com'),
  ('dddddddd-0000-0000-0000-000000000004', 'toran@example.com');
insert into public.toran_admins (user_id) values ('dddddddd-0000-0000-0000-000000000004');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'busy-mandir', 'Busy Mandir', 'Harrow', 'London', 'claimed'),
  ('20000000-0000-0000-0000-000000000002', 'quiet-mandir', 'Quiet Mandir', 'Leeds', 'North', 'claimed'),
  ('30000000-0000-0000-0000-000000000003', 'listed-mandir', 'Listed Mandir', 'Derby', 'Midlands', 'listed'),
  ('40000000-0000-0000-0000-000000000004', 'hidden-mandir', 'Hidden Mandir', 'Bath', 'South West', 'hidden');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001');

insert into public.events (id, mandir_id, title, starts_at, status, confirmed_at, recurrence) values
  -- Coming up, never confirmed.
  ('e1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Never confirmed', now() + interval '5 days', 'published', null, null),
  -- Coming up, confirmed long ago.
  ('e2000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003',
   'Confirmed long ago', now() + interval '10 days', 'published', now() - interval '40 days', null),
  -- Coming up, confirmed lately: fine.
  ('e3000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001',
   'Confirmed lately', now() + interval '3 days', 'published', now() - interval '2 days', null),
  -- Too far ahead to worry about yet.
  ('e4000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001',
   'Far ahead', now() + interval '60 days', 'published', null, null),
  -- Drafts, past events and hidden mandirs' events don't count.
  ('e5000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001',
   'A draft', now() + interval '5 days', 'draft', null, null),
  ('e6000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002',
   'Last month', now() - interval '30 days', 'published', null, null),
  ('e7000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000004',
   'Hidden', now() + interval '5 days', 'published', null, null),
  -- Repeating: started long ago, next date soon.
  ('e8000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001',
   'Weekly aarti', now() - interval '60 days', 'published', null, 'RRULE:FREQ=WEEKLY');
insert into public.event_occurrences (event_id, starts_at, cancelled) values
  ('e8000000-0000-0000-0000-000000000008', now() + interval '1 day', true),
  ('e8000000-0000-0000-0000-000000000008', now() + interval '8 days', false);

insert into public.sources (mandir_id, kind, url, last_checked_at, last_outcome, last_notes) values
  ('10000000-0000-0000-0000-000000000001', 'crawler', 'https://busy.example', now(), 'unreachable', 'Timed out'),
  ('30000000-0000-0000-0000-000000000003', 'crawler', 'https://listed.example', now(), 'found', null);

insert into public.mandir_invites (mandir_id, email, expires_at) values
  ('10000000-0000-0000-0000-000000000001', 'soon@example.com', now() + interval '1 day'),
  ('20000000-0000-0000-0000-000000000002', 'later@example.com', now() + interval '10 days');

insert into public.festivals (id, slug, name) values
  ('f0000000-0000-0000-0000-000000000001', 'test-utsav', 'Test utsav');
insert into public.festival_dates (festival_id, calendar, starts_on, ends_on, verified) values
  ('f0000000-0000-0000-0000-000000000001', null, current_date + 20, current_date + 20, false),
  ('f0000000-0000-0000-0000-000000000001', 'gujarati', current_date + 21, current_date + 21, true),
  ('f0000000-0000-0000-0000-000000000001', 'tamil', current_date + 200, current_date + 200, false);

insert into public.event_claims (mandir_id, proposed, created_at) values
  ('30000000-0000-0000-0000-000000000003', '{"title":"Old poster"}', now() - interval '5 days'),
  ('30000000-0000-0000-0000-000000000003', '{"title":"Older poster"}', now() - interval '9 days'),
  ('10000000-0000-0000-0000-000000000001', '{"title":"New poster"}', now() - interval '1 hour');

insert into public.mandir_claims (mandir_id, user_id, role_at_mandir, created_at) values
  ('30000000-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000003', 'Trustee',
   now() - interval '4 days');

-- Someone signed in who isn't a Toran admin ------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$select public.needs_attention()$$, '42501', 'not_allowed',
  'a committee member can''t see the list');

-- A Toran admin ----------------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated","aal":"aal2"}', true);
create temporary table answer on commit drop as select public.needs_attention() as a;

select is(
  (select array_agg(i ->> 'title' order by i ->> 'title')
     from answer, jsonb_array_elements(a -> 'unconfirmed' -> 'items') i
     where i ->> 'title' in ('Never confirmed', 'Confirmed long ago', 'Confirmed lately',
       'Far ahead', 'A draft', 'Last month', 'Hidden', 'Weekly aarti')),
  array['Confirmed long ago', 'Never confirmed', 'Weekly aarti'],
  'events coming up in 30 days and not confirmed in the last 30');
select is(
  (select (i ->> 'next_at')::timestamptz > now() + interval '7 days'
     from answer, jsonb_array_elements(a -> 'unconfirmed' -> 'items') i
     where i ->> 'title' = 'Weekly aarti'),
  true, 'a repeating event by its next date that isn''t cancelled');
select is(
  (select (i ->> 'has_committee')::boolean
     from answer, jsonb_array_elements(a -> 'unconfirmed' -> 'items') i
     where i ->> 'title' = 'Confirmed long ago'),
  false, 'saying when the mandir has no committee to ask');
select is(
  (select jsonb_array_length(a -> 'unconfirmed' -> 'items') = (a -> 'unconfirmed' ->> 'total')::int
     from answer),
  true, 'with the total');

select is(
  (select array_agg(i ->> 'slug') from answer, jsonb_array_elements(a -> 'quiet' -> 'items') i),
  array['quiet-mandir'], 'committees with nothing coming up');
select is(
  (select (i ->> 'last_added') is not null
     from answer, jsonb_array_elements(a -> 'quiet' -> 'items') i),
  true, 'with when they last added something');

select is(
  (select array_agg((i ->> 'slug') || ' ' || (i ->> 'outcome'))
     from answer, jsonb_array_elements(a -> 'websites' -> 'items') i),
  array['busy-mandir unreachable'], 'websites the checker couldn''t read');

select is(
  (select array_agg(i ->> 'slug') from answer, jsonb_array_elements(a -> 'invites' -> 'items') i),
  array['busy-mandir'], 'invites running out in the next 3 days');
select is(
  (select count(*)::int from answer, jsonb_array_elements(a -> 'invites' -> 'items') i
     where i ? 'email' or i::text like '%@%'),
  0, 'without the colleague''s email address');

select is(
  (select array_agg(i ->> 'starts_on')
     from answer, jsonb_array_elements(a -> 'festival_dates' -> 'items') i
     where i ->> 'name' = 'Test utsav'),
  array[(current_date + 20)::text], 'festival dates soon that aren''t checked');

select is(
  (select array_agg((i ->> 'slug') || ' ' || (i ->> 'waiting'))
     from answer, jsonb_array_elements(a -> 'posters' -> 'items') i),
  array['listed-mandir 2'], 'posters waiting more than 3 days, per mandir');
select is((select (a -> 'posters' ->> 'total')::int from answer), 1,
  'counting the mandirs');

select is(
  (select array_agg(i ->> 'slug') from answer, jsonb_array_elements(a -> 'claims' -> 'items') i),
  array['listed-mandir'], 'committee requests waiting more than 2 days');

-- Visitors ---------------------------------------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$select public.needs_attention()$$, '42501', null,
  'visitors can''t call it at all');

reset role;
select is((select count(*)::int from public.mandir_invites), 2, 'nothing was changed');

select * from finish();
rollback;
