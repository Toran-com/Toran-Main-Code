-- Events held somewhere else: the committee sets the place when editing,
-- an edit that leaves it out keeps it, and a place needs both its name
-- and its postcode.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');
insert into public.events (id, mandir_id, title, starts_at, status) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Diwali mela', '2030-11-01 18:00+00', 'published');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "aaaaaaaa-0000-0000-0000-000000000001", "role": "authenticated"}', true);

select lives_ok(
  $$select public.edit_event('20000000-0000-0000-0000-000000000001',
    '{"title": "Diwali mela", "starts_at": "2030-11-01T18:00:00Z",
      "location_note": "Sports hall, enter from the car park",
      "venue_name": "Harrow Leisure Centre", "venue_postcode": "HA3 5BD"}'::jsonb,
    '{}', '2030-01-01T00:00:00Z')$$,
  'the committee sets where it is held');
select is(
  (select row(location_note, venue_name, venue_postcode)::text from public.events
    where id = '20000000-0000-0000-0000-000000000001'),
  row('Sports hall, enter from the car park', 'Harrow Leisure Centre', 'HA3 5BD')::text,
  'it is saved');

select lives_ok(
  $$select public.edit_event('20000000-0000-0000-0000-000000000001',
    '{"title": "Diwali mela and fireworks", "starts_at": "2030-11-01T18:00:00Z"}'::jsonb,
    '{}', '2030-01-01T00:00:00Z')$$,
  'an edit that leaves it out');
select is(
  (select row(location_note, venue_name, venue_postcode)::text from public.events
    where id = '20000000-0000-0000-0000-000000000001'),
  row('Sports hall, enter from the car park', 'Harrow Leisure Centre', 'HA3 5BD')::text,
  'keeps it as it was');

select throws_ok(
  $$update public.events set venue_postcode = null
    where id = '20000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'a place needs its postcode as well as its name');

select * from finish();
rollback;
