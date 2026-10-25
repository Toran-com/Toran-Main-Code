-- One copy of each event: the safety net, decisions that two look-alikes
-- are different, merging, and visitors' reports of events already known.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com'),
  ('cccccccc-0000-0000-0000-000000000003', 'c@example.com');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed'),
  ('10000000-0000-0000-0000-000000000002', 'mandir-two', 'Mandir Two', 'Leicester', 'East Midlands', 'listed');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');

insert into public.events (id, mandir_id, title, starts_at, all_day, status, summary) values
  ('e1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Chopda Pujan', '2026-11-08 20:00+00', false, 'published', null),
  ('e1000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
   'Annakut', '2026-11-09 00:00+00', true, 'published', null);

-- The safety net --------------------------------------------------------------------------
select throws_ok(
  $$insert into public.events (mandir_id, title, starts_at, status) values
    ('10000000-0000-0000-0000-000000000001', 'Chopda pujan!', '2026-11-08 20:00+00', 'published')$$,
  '23505', null, 'the same name at the same time on the same day is refused');
select throws_ok(
  $$insert into public.events (mandir_id, title, starts_at, status) values
    ('10000000-0000-0000-0000-000000000001', 'annakut', '2026-11-09 11:00+00', 'published')$$,
  '23505', null, 'a timed copy of an all-day event is refused');
select lives_ok(
  $$insert into public.events (mandir_id, title, starts_at, status) values
    ('10000000-0000-0000-0000-000000000001', 'Chopda Pujan', '2026-11-08 09:00+00', 'published')$$,
  'the same name at another time that day is allowed');
select lives_ok(
  $$insert into public.events (mandir_id, title, starts_at, status) values
    ('10000000-0000-0000-0000-000000000002', 'Chopda Pujan', '2026-11-08 20:00+00', 'published')$$,
  'another mandir may have an event of the same name');
select lives_ok(
  $$insert into public.events (mandir_id, title, starts_at, status) values
    ('10000000-0000-0000-0000-000000000001', 'Chopda Pujan', '2026-11-08 20:00+00', 'removed')$$,
  'a removed copy is no trouble');

-- Look-alikes said to be different ----------------------------------------------------------
insert into public.events (id, mandir_id, title, starts_at, status) values
  ('e1000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001',
   'Aarti', '2026-11-10 07:00+00', 'published'),
  ('e1000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002',
   'Aarti', '2026-11-10 07:00+00', 'published');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);
select throws_ok(
  $$insert into public.distinct_events (first_id, second_id) values
    ('e1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000003')$$,
  '42501', null, 'someone else can''t record a decision');

select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
select lives_ok(
  $$insert into public.distinct_events (first_id, second_id) values
    ('e1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000003')$$,
  'the committee records that two events are different');
select throws_ok(
  $$insert into public.distinct_events (first_id, second_id) values
    ('e1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000004')$$,
  '42501', null, 'events at two mandirs can''t be paired');
select is((select count(*)::int from public.distinct_events), 1,
  'the committee sees its decision');

-- Merging -----------------------------------------------------------------------------------
insert into public.events (id, mandir_id, title, starts_at, all_day, status, summary, link, kind) values
  ('e1000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001',
   'Nutan Varsh and Annakut darshan', '2026-11-09 07:00+00', false, 'published',
   'Darshan from 7am.', 'https://example.org/annakut', 'festival');
insert into public.event_claims (mandir_id, event_id, proposed, status) values
  ('10000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000005',
   '{"title":"Annakut","date":"2026-11-09"}', 'accepted');

select lives_ok(
  $$select public.merge_events('e1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000005')$$,
  'the committee merges two copies');
select is((select status from public.events where id = 'e1000000-0000-0000-0000-000000000005'),
  'removed', 'the other copy is removed');
select is((select summary || ' ' || link || ' ' || kind from public.events
    where id = 'e1000000-0000-0000-0000-000000000002'),
  'Darshan from 7am. https://example.org/annakut festival', 'the one kept gains what only the other said');
select is((select all_day::text || ' ' || starts_at::text from public.events
    where id = 'e1000000-0000-0000-0000-000000000002'),
  'false 2026-11-09 07:00:00+00', 'an all-day event gains the other''s start time');
select is((select event_id from public.event_claims where proposed ->> 'title' = 'Annakut'),
  'e1000000-0000-0000-0000-000000000002'::uuid, 'claims point at the one kept');

insert into public.seva_roles (event_id, name) values ('e1000000-0000-0000-0000-000000000003', 'Kitchen');
select throws_ok(
  $$select public.merge_events('e1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000003')$$,
  '55000', null, 'an event with a seva rota isn''t merged away');
select lives_ok(
  $$select public.fill_event_gaps('e1000000-0000-0000-0000-000000000001',
    '{"summary":"From 8pm.","kind":"festival"}')$$,
  'gaps are filled');
select is((select coalesce(summary, '') from public.events where id = 'e1000000-0000-0000-0000-000000000001'),
  'From 8pm.', 'a missing description is added');

-- Visitors' reports ---------------------------------------------------------------------------
reset role;
select public.report_event('mandir-one',
  '{"title":"CHOPDA PUJAN","date":"2026-11-08","time":"20:00"}');
select is((select count(*)::int from public.event_claims c
    where c.proposed ->> 'from' = 'visitor'), 0,
  'a report of an event already listed isn''t queued');

select * from finish();
rollback;
