-- An event's end time: edit_event sets it, each future date of a repeating
-- event ends the same length after it starts, and an empty end time
-- clears it.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-0000000000e1', 'end@example.com');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-0000000000e1', 'mandir-end', 'Mandir End', 'Harrow', 'London', 'claimed');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-0000000000e1', 'aaaaaaaa-0000-0000-0000-0000000000e1');

-- A weekly aarti at 6pm: one date past, two to come.
insert into public.events (id, mandir_id, title, starts_at, recurrence, status) values
  ('e1000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-0000000000e1',
   'Aarti', '2026-10-03 18:00+00', 'RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=SA;UNTIL=20261024', 'published');
insert into public.event_occurrences (event_id, starts_at) values
  ('e1000000-0000-0000-0000-0000000000e1', '2026-10-03 18:00+00'),
  ('e1000000-0000-0000-0000-0000000000e1', '2026-10-17 18:00+00'),
  ('e1000000-0000-0000-0000-0000000000e1', '2026-10-24 18:00+00');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-0000000000e1","role":"authenticated","aal":"aal1"}', true);

-- 6pm to 7.30pm from now on.
select lives_ok(
  $$select public.edit_event('e1000000-0000-0000-0000-0000000000e1',
    '{"title":"Aarti","starts_at":"2026-10-17 18:00+00","ends_at":"2026-10-17 19:30+00","recurrence":"RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=SA;UNTIL=20261024"}',
    array['2026-10-17 18:00+00','2026-10-24 18:00+00']::timestamptz[], '2026-10-14 00:00+00')$$,
  'the committee gives it an end time');
select is(
  (select ends_at from public.events where id = 'e1000000-0000-0000-0000-0000000000e1'),
  '2026-10-17 19:30+00'::timestamptz, 'the event ends at 7.30pm');
select is(
  (select ends_at from public.event_occurrences
    where event_id = 'e1000000-0000-0000-0000-0000000000e1' and starts_at = '2026-10-24 18:00+00'),
  '2026-10-24 19:30+00'::timestamptz, 'a later date ends 90 minutes after it starts too');
select is(
  (select ends_at from public.event_occurrences
    where event_id = 'e1000000-0000-0000-0000-0000000000e1' and starts_at = '2026-10-03 18:00+00'),
  null, 'a date already past is left as it was');

-- An empty end time clears it.
select lives_ok(
  $$select public.edit_event('e1000000-0000-0000-0000-0000000000e1',
    '{"title":"Aarti","starts_at":"2026-10-17 18:00+00","ends_at":"","recurrence":"RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=SA;UNTIL=20261024"}',
    array['2026-10-17 18:00+00','2026-10-24 18:00+00']::timestamptz[], '2026-10-14 00:00+00')$$,
  'the end time can be taken off');
select is(
  (select count(*)::int from public.event_occurrences
    where event_id = 'e1000000-0000-0000-0000-0000000000e1' and starts_at >= '2026-10-14' and ends_at is not null),
  0, 'and the dates to come lose it too');

select * from finish();
rollback;
