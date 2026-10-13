-- Listing and removing a mandir's admins: Toran admins with the second
-- factor only.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@example.com'),
  ('dddddddd-0000-0000-0000-000000000004', 't@example.com');
insert into public.toran_admins (user_id) values ('dddddddd-0000-0000-0000-000000000004');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002');

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$select * from public.mandir_admin_list('10000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'visitors cannot list mandir admins');

reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$select public.remove_mandir_admin('10000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002')$$,
  '42501', null, 'a mandir admin cannot remove a colleague');

select set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$select * from public.mandir_admin_list('10000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'a Toran admin needs the second factor');

select set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.mandir_admin_list('10000000-0000-0000-0000-000000000001')), 2,
  'a Toran admin sees who looks after a mandir');
select public.remove_mandir_admin('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');
select is((select status from public.mandirs where slug = 'mandir-one'), 'claimed',
  'the mandir stays claimed while someone still looks after it');
select public.remove_mandir_admin('10000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000002');
select is((select count(*)::int from public.mandir_admin_list('10000000-0000-0000-0000-000000000001')), 0,
  'both have been removed');
select is((select status from public.mandirs where slug = 'mandir-one'), 'listed',
  'with nobody left, the mandir can be claimed again');

select * from finish();
rollback;
