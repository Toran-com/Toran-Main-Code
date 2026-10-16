-- Taking a seva slot without a name: when it's allowed, that the count
-- follows, and that nobody but the committee can see or clear slots.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com'),
  ('cccccccc-0000-0000-0000-000000000003', 'c@example.com');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');

-- An event open for sign-up, and one that isn't.
insert into public.events (id, mandir_id, title, starts_at, status, seva_open) values
  ('e1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Diwali', now() + interval '7 days', 'published', true),
  ('e2000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
   'Annakut', now() + interval '8 days', 'published', false);
insert into public.seva_roles (id, event_id, name, needs_dbs) values
  ('b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Kitchen', false),
  ('b2000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'Children''s corner', true),
  ('b3000000-0000-0000-0000-000000000003', 'e2000000-0000-0000-0000-000000000002', 'Shoes', false);
insert into public.seva_shifts (id, role_id, starts_at, ends_at, needed, filled_offline) values
  -- Kitchen needs 3; the committee already has 1 from WhatsApp.
  ('51000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   now() + interval '7 days', now() + interval '7 days 4 hours', 3, 1),
  ('52000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002',
   now() + interval '7 days', now() + interval '7 days 4 hours', 2, 0),
  ('53000000-0000-0000-0000-000000000003', 'b3000000-0000-0000-0000-000000000003',
   now() + interval '8 days', now() + interval '8 days 4 hours', 2, 0);

-- A visitor --------------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select isnt(public.take_seva_slot('51000000-0000-0000-0000-000000000001'), null,
  'a visitor can take a slot and gets a number for it');
select is((select taken_online from public.seva_shifts where id = '51000000-0000-0000-0000-000000000001'),
  1, 'the shift counts it');
select lives_ok($$select public.take_seva_slot('51000000-0000-0000-0000-000000000001')$$,
  'a second visitor takes the last slot');
select throws_ok($$select public.take_seva_slot('51000000-0000-0000-0000-000000000001')$$,
  'P0001', 'full', 'a full shift can''t be taken');
select throws_ok($$select public.take_seva_slot('52000000-0000-0000-0000-000000000002')$$,
  'P0001', 'closed', 'a role needing a DBS check can''t be taken online');
select throws_ok($$select public.take_seva_slot('53000000-0000-0000-0000-000000000003')$$,
  'P0001', 'closed', 'an event without sign-up turned on can''t be taken');
select throws_ok($$select public.take_seva_slot('59999999-0000-0000-0000-000000000000')$$,
  'P0001', 'closed', 'an unknown shift can''t be taken');
select throws_ok($$select * from public.seva_slots$$, '42501', null,
  'visitors can''t list slots');
select throws_ok($$update public.seva_shifts set taken_online = 0$$, '42501', null,
  'visitors can''t change the count');

-- Giving one back needs its number.
reset role;
create temporary table taken as
  select id from public.seva_slots where shift_id = '51000000-0000-0000-0000-000000000001' limit 1;
grant select on taken to anon;
set local role anon;
select is(public.give_back_seva_slot('59999999-0000-0000-0000-000000000000'), false,
  'a made-up number gives nothing back');
select is(public.give_back_seva_slot((select id from taken)), true,
  'the volunteer can give their slot back');
select is((select taken_online from public.seva_shifts where id = '51000000-0000-0000-0000-000000000001'),
  1, 'the count goes down');

-- Someone signed in who doesn't run the mandir -----------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.seva_slots), 0, 'others see no slots');

-- The committee ----------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.seva_slots), 1, 'the committee sees its slots');
select throws_ok($$update public.seva_shifts set taken_online = 9
    where id = '51000000-0000-0000-0000-000000000001'$$, '42501', null,
  'the committee can''t change the online count directly');
select lives_ok($$update public.seva_shifts set filled_offline = 2
    where id = '51000000-0000-0000-0000-000000000001'$$,
  'the committee can change its own count');
delete from public.seva_slots where shift_id = '51000000-0000-0000-0000-000000000001';
select is((select taken_online from public.seva_shifts where id = '51000000-0000-0000-0000-000000000001'),
  0, 'clearing the slots resets the online count');

select * from finish();
rollback;
