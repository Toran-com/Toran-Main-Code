-- Who can see and change events, festivals, sources, claims and rotas.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com'),
  ('cccccccc-0000-0000-0000-000000000003', 'c@example.com'),
  ('dddddddd-0000-0000-0000-000000000004', 't@example.com');
insert into public.toran_admins (user_id) values ('dddddddd-0000-0000-0000-000000000004');

insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed'),
  ('20000000-0000-0000-0000-000000000002', 'mandir-two', 'Mandir Two', 'Leicester', 'Leicester', 'listed'),
  ('30000000-0000-0000-0000-000000000003', 'mandir-hidden', 'Hidden Mandir', 'Brent', 'London', 'hidden');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');

insert into public.events (id, mandir_id, title, starts_at, status) values
  ('e1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Garba night 1', '2026-10-11 19:00+01', 'published'),
  ('e2000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Draft event', '2026-10-12 19:00+01', 'draft'),
  ('e3000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'At a hidden mandir', '2026-10-13 19:00+01', 'published'),
  ('e4000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'Mandir two event', '2026-10-14 19:00+01', 'published');
insert into public.event_occurrences (event_id, starts_at) values
  ('e1000000-0000-0000-0000-000000000001', '2026-10-11 19:00+01'),
  ('e2000000-0000-0000-0000-000000000002', '2026-10-12 19:00+01');
insert into public.festivals (id, slug, name) values
  ('f0000000-0000-0000-0000-000000000001', 'navratri', 'Navratri');
insert into public.seva_roles (id, event_id, name) values
  ('51000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Kitchen'),
  ('52000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000002', 'Parking');

-- Visitors ---------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is((select count(*)::int from public.events), 2,
  'visitors see published events at visible mandirs only');
select is((select count(*)::int from public.event_occurrences), 1,
  'visitors see dates only for events they can see');
select is((select count(*)::int from public.seva_roles), 1,
  'visitors see rota roles only for events they can see');
select is((select count(*)::int from public.festivals), 1, 'visitors see festivals');
select throws_ok(
  $$insert into public.events (mandir_id, title, starts_at) values
    ('10000000-0000-0000-0000-000000000001', 'Spam', now())$$,
  '42501', null, 'visitors cannot add events');
select throws_ok('select * from public.sources', '42501', null, 'visitors cannot see sources');
select throws_ok('select * from public.event_claims', '42501', null, 'visitors cannot see the review queue');

-- A member with no role ------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);

select throws_ok(
  $$insert into public.festivals (slug, name) values ('fake', 'Fake festival')$$,
  '42501', null, 'members cannot add festivals');
select throws_ok(
  $$insert into public.seva_roles (event_id, name) values ('e1000000-0000-0000-0000-000000000001', 'Spam')$$,
  '42501', null, 'members cannot add rota roles');

-- Mandir 1's admin --------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);

select is((select count(*)::int from public.events where mandir_id = '10000000-0000-0000-0000-000000000001'), 2,
  'a mandir admin sees their drafts too');
select lives_ok(
  $$insert into public.events (mandir_id, title, starts_at, status) values
    ('10000000-0000-0000-0000-000000000001', 'Diwali celebrations', '2026-11-08 18:00+00', 'published')$$,
  'a mandir admin can add an event for their mandir');
select throws_ok(
  $$insert into public.events (mandir_id, title, starts_at) values
    ('20000000-0000-0000-0000-000000000002', 'Not mine', now())$$,
  '42501', null, 'a mandir admin cannot add events for another mandir');
with u as (update public.events set title = 'Hijacked' where id = 'e4000000-0000-0000-0000-000000000004' returning 1)
select is(count(*)::int, 0, 'a mandir admin cannot edit another mandir''s events') from u;
select throws_ok(
  $$delete from public.events where id = 'e1000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'events are never deleted, only marked removed');

update public.events set confirmed_at = now(), confirmed_by = 'cccccccc-0000-0000-0000-000000000003'
  where id = 'e1000000-0000-0000-0000-000000000001';
select is(
  (select confirmed_by from public.events where id = 'e1000000-0000-0000-0000-000000000001'),
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
  'confirming records who actually did it, whatever was typed');

select lives_ok(
  $$insert into public.seva_roles (event_id, name) values ('e1000000-0000-0000-0000-000000000001', 'Shoes')$$,
  'a mandir admin can add rota roles to their events');
select throws_ok(
  $$insert into public.seva_roles (event_id, name) values ('e4000000-0000-0000-0000-000000000004', 'Shoes')$$,
  '42501', null, 'a mandir admin cannot add rota roles to another mandir''s event');
select lives_ok(
  $$insert into public.event_claims (mandir_id, proposed, confidence) values
    ('10000000-0000-0000-0000-000000000001', '{"title":"Garba night 2"}', 0.9)$$,
  'a mandir admin can add to their review queue');
select throws_ok(
  $$insert into public.event_claims (mandir_id, proposed) values
    ('20000000-0000-0000-0000-000000000002', '{"title":"x"}')$$,
  '42501', null, 'a mandir admin cannot add to another mandir''s review queue');

-- Toran admin ---------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated","aal":"aal2"}', true);

select lives_ok(
  $$insert into public.festival_dates (festival_id, calendar, starts_on, ends_on, source)
    values ('f0000000-0000-0000-0000-000000000001', null, '2026-10-11', '2026-10-19', 'test')$$,
  'a Toran admin can add festival dates');
select throws_ok(
  $$insert into public.festival_dates (festival_id, calendar, starts_on, ends_on)
    values ('f0000000-0000-0000-0000-000000000001', null, '2026-10-11', '2026-10-19')$$,
  '23505', null, 'the same festival date cannot be added twice');
select is((select count(*)::int from public.events), 5, 'a Toran admin sees every event');

select * from finish();
rollback;
