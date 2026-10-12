-- Only a Toran admin with the second factor can see the claim review list.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email) values
  ('cccccccc-0000-0000-0000-000000000003', 'c@example.com'),
  ('dddddddd-0000-0000-0000-000000000004', 't@example.com');
insert into public.toran_admins (user_id) values ('dddddddd-0000-0000-0000-000000000004');
insert into public.mandirs (id, slug, name, town, region) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London');
insert into public.mandir_claims (mandir_id, user_id, role_at_mandir, message) values
  ('10000000-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000003', 'Secretary', 'Call the office');

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok('select * from public.pending_mandir_claims()', '42501', null,
  'visitors cannot see the claim list');

reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);
select throws_ok('select * from public.pending_mandir_claims()', '42501', null,
  'a member cannot see the claim list, even with their own claim in it');

select set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated","aal":"aal1"}', true);
select throws_ok('select * from public.pending_mandir_claims()', '42501', null,
  'a Toran admin needs the second factor');

select set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated","aal":"aal2"}', true);
select is((select claimant_email from public.pending_mandir_claims() where mandir_slug = 'mandir-one'),
  'c@example.com', 'a Toran admin sees who claimed, to check with the mandir');
select public.decide_mandir_claim((select id from public.pending_mandir_claims() where mandir_slug = 'mandir-one'), false);
select is((select count(*)::int from public.pending_mandir_claims() where mandir_slug = 'mandir-one'), 0,
  'decided claims leave the list');

select * from finish();
rollback;
