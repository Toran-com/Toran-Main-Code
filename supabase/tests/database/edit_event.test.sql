-- Editing an event: who may, and what happens to a repeating event's dates.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com'),
  ('cccccccc-0000-0000-0000-000000000003', 'c@example.com'),
  ('dddddddd-0000-0000-0000-000000000004', 't@example.com');
insert into public.toran_admins (user_id) values ('dddddddd-0000-0000-0000-000000000004');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');

-- A weekly aarti: one date in the past, three to come (one cancelled).
insert into public.events (id, mandir_id, title, starts_at, recurrence, status) values
  ('e1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Aarti', '2026-10-03 18:00+00', 'RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=SA;UNTIL=20261031', 'published');
insert into public.event_occurrences (event_id, starts_at, cancelled) values
  ('e1000000-0000-0000-0000-000000000001', '2026-10-03 18:00+00', false),
  ('e1000000-0000-0000-0000-000000000001', '2026-10-17 18:00+00', false),
  ('e1000000-0000-0000-0000-000000000001', '2026-10-24 18:00+00', true),
  ('e1000000-0000-0000-0000-000000000001', '2026-10-31 18:00+00', false);

-- Someone who doesn't run the mandir ----------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);
select throws_ok(
  $$select public.edit_event('e1000000-0000-0000-0000-000000000001',
    '{"title":"Hijacked","starts_at":"2026-10-17 18:00+00"}', '{}', '2026-10-14 00:00+00')$$,
  'P0002', null, 'someone else cannot edit the event');

-- The mandir's admin ----------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
-- Moves it to 7pm until 7 November.
select lives_ok(
  $$select public.edit_event('e1000000-0000-0000-0000-000000000001',
    '{"title":"Sandhya aarti","summary":"","title_gu":"સંધ્યા આરતી","starts_at":"2026-10-17 18:00+00","all_day":false,
      "recurrence":"RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=SA;UNTIL=20261107"}',
    array['2026-10-17 18:00+00','2026-10-24 18:00+00','2026-10-31 18:00+00','2026-11-07 19:00+00']::timestamptz[],
    '2026-10-14 00:00+00')$$,
  'the mandir''s admin can edit it');

select is((select title from public.events where id = 'e1000000-0000-0000-0000-000000000001'),
  'Sandhya aarti', 'the new name is saved');
select is((select summary from public.events where id = 'e1000000-0000-0000-0000-000000000001'),
  null, 'an empty description is saved as none');
select is((select title_gu from public.events where id = 'e1000000-0000-0000-0000-000000000001'),
  'સંધ્યા આરતી', 'the Gujarati name is saved');
select isnt((select confirmed_by from public.events where id = 'e1000000-0000-0000-0000-000000000001'),
  null, 'editing as the committee confirms it');
select is((select count(*)::int from public.event_occurrences
    where event_id = 'e1000000-0000-0000-0000-000000000001' and starts_at < '2026-10-14'),
  1, 'past dates are left alone');
select is((select count(*)::int from public.event_occurrences
    where event_id = 'e1000000-0000-0000-0000-000000000001' and starts_at >= '2026-10-14'),
  4, 'future dates are replaced');
select is((select cancelled from public.event_occurrences
    where event_id = 'e1000000-0000-0000-0000-000000000001' and starts_at = '2026-10-24 18:00+00'),
  true, 'a date already cancelled stays cancelled');

-- Made a one-off: its future dates go.
select public.edit_event('e1000000-0000-0000-0000-000000000001',
  '{"title":"Sandhya aarti","starts_at":"2026-10-17 18:00+00"}', '{}', '2026-10-14 00:00+00');
select is((select count(*)::int from public.event_occurrences
    where event_id = 'e1000000-0000-0000-0000-000000000001' and starts_at >= '2026-10-14'),
  0, 'a one-off keeps no future dates');

-- A Toran admin ------------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated","aal":"aal2"}', true);
select public.edit_event('e1000000-0000-0000-0000-000000000001',
  '{"title":"Evening aarti","starts_at":"2026-10-17 18:00+00"}', '{}', '2026-10-14 00:00+00');
select is((select confirmed_by from public.events where id = 'e1000000-0000-0000-0000-000000000001'),
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
  'a Toran admin''s edit doesn''t count as the mandir confirming it');

select * from finish();
rollback;
