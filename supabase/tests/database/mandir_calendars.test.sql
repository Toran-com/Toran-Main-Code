-- A mandir's events calendar address is private: its committee and
-- Toran's admins can see and change it; visitors and other committees
-- can't, and only https addresses are kept.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@example.com'),
  ('dddddddd-0000-0000-0000-000000000004', 'toran@example.com');
insert into public.toran_admins (user_id) values ('dddddddd-0000-0000-0000-000000000004');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed'),
  ('20000000-0000-0000-0000-000000000002', 'mandir-two', 'Mandir Two', 'Leicester', 'East Midlands', 'claimed');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "aaaaaaaa-0000-0000-0000-000000000001", "role": "authenticated"}', true);
select lives_ok(
  $$insert into public.mandir_calendars (mandir_id, url) values
      ('10000000-0000-0000-0000-000000000001',
       'https://calendar.google.com/calendar/ical/x%40group.calendar.google.com/private-abc/basic.ics')$$,
  'the committee adds its calendar');
select is((select count(*)::int from public.mandir_calendars), 1, 'and sees it');
select throws_ok(
  $$insert into public.mandir_calendars (mandir_id, url) values
      ('20000000-0000-0000-0000-000000000002', 'https://example.com/events.ics')$$,
  '42501', null, 'but not for another mandir');
select throws_ok(
  $$update public.mandir_calendars set url = 'http://example.com/events.ics'$$,
  '23514', null, 'only https addresses are kept');

select set_config('request.jwt.claims',
  '{"sub": "bbbbbbbb-0000-0000-0000-000000000002", "role": "authenticated"}', true);
select is((select count(*)::int from public.mandir_calendars), 0,
  'another committee can''t see it');
select lives_ok($$delete from public.mandir_calendars$$, 'nor remove it');

select set_config('request.jwt.claims',
  '{"sub": "dddddddd-0000-0000-0000-000000000004", "role": "authenticated", "aal": "aal2"}', true);
select is((select count(*)::int from public.mandir_calendars), 1, 'Toran admins see it');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok('select * from public.mandir_calendars', '42501', null,
  'visitors can''t read it');

reset role;
select is((select count(*)::int from public.mandir_calendars), 1,
  'and it was still there after the other committee tried');

select * from finish();
rollback;
