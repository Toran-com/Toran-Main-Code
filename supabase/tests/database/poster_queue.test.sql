-- The poster queue: who can see and review a mandir's forwarded posters,
-- and that the database records who reviewed them.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'committee@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'other@example.com'),
  ('dddddddd-0000-0000-0000-000000000004', 't@example.com');
insert into public.toran_admins (user_id) values ('dddddddd-0000-0000-0000-000000000004');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed'),
  ('20000000-0000-0000-0000-000000000002', 'mandir-two', 'Mandir Two', 'Leeds', 'Yorkshire and the Humber', 'listed');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');

-- A Toran admin types up two posters.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated","aal":"aal2"}', true);
insert into public.event_claims (id, mandir_id, proposed, status) values
  ('c1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   '{"title":"Annakut"}', 'accepted'),
  ('c2000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
   '{"title":"Bhajan evening"}', 'pending');
select is((select status from public.event_claims where id = 'c1000000-0000-0000-0000-000000000001'),
  'pending', 'a new poster always starts pending');

-- Visitors see nothing.
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$select * from public.event_claims$$, '42501', null,
  'visitors cannot see the poster queue');

-- Another signed-in person sees nothing.
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.event_claims), 0,
  'someone who runs no mandir sees no posters');

-- The committee sees only its own mandir's poster, and publishes it.
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
select results_eq($$select mandir_id from public.event_claims$$,
  $$values ('10000000-0000-0000-0000-000000000001'::uuid)$$,
  'a committee sees its own mandir''s posters only');
update public.event_claims set status = 'accepted', reviewed_by = 'bbbbbbbb-0000-0000-0000-000000000002'
  where id = 'c1000000-0000-0000-0000-000000000001';
select is((select reviewed_by from public.event_claims where id = 'c1000000-0000-0000-0000-000000000001'),
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid,
  'the database records who reviewed it, whatever was sent');
select isnt((select reviewed_at from public.event_claims where id = 'c1000000-0000-0000-0000-000000000001'),
  null, 'and when');
select throws_ok($$update public.event_claims set status = 'rejected'
  where id = 'c1000000-0000-0000-0000-000000000001'$$,
  '23514', 'This poster has already been reviewed', 'a decision cannot be changed');
select is((select count(*)::int from public.event_claims
  where id = 'c2000000-0000-0000-0000-000000000002'), 0,
  'the committee cannot see another mandir''s poster');

-- Toran handles the poster for the mandir nobody looks after.
select set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated","aal":"aal2"}', true);
update public.event_claims set status = 'rejected'
  where id = 'c2000000-0000-0000-0000-000000000002';
select is((select reviewed_by from public.event_claims where id = 'c2000000-0000-0000-0000-000000000002'),
  'dddddddd-0000-0000-0000-000000000004'::uuid, 'Toran can review any poster');

select * from finish();
rollback;
