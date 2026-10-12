-- Who can see and change mandirs, their private contacts, and claims.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- People: A runs mandir 1, B runs mandir 2, C is a member with no role,
-- T is a Toran admin.
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@example.com'),
  ('cccccccc-0000-0000-0000-000000000003', 'c@example.com'),
  ('dddddddd-0000-0000-0000-000000000004', 't@example.com');
insert into public.toran_admins (user_id) values ('dddddddd-0000-0000-0000-000000000004');

insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed'),
  ('20000000-0000-0000-0000-000000000002', 'mandir-two', 'Mandir Two', 'Leicester', 'Leicester', 'claimed'),
  ('30000000-0000-0000-0000-000000000003', 'mandir-hidden', 'Hidden Mandir', 'Brent', 'London', 'hidden');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002');
insert into public.mandir_contacts (mandir_id, email)
  values ('10000000-0000-0000-0000-000000000001', 'committee@mandir-one.org');

-- Visitors ------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is((select count(*)::int from public.mandirs), 2, 'visitors see listed mandirs, not hidden ones');
select throws_ok(
  $$insert into public.mandirs (slug, name, town, region) values ('x', 'X Mandir', 'Town', 'Region')$$,
  '42501', null, 'visitors cannot add mandirs');
select throws_ok('select * from public.mandir_contacts', '42501', null,
  'visitors cannot read private contacts');
select throws_ok('select * from public.mandir_claims', '42501', null,
  'visitors cannot read claims');

-- A member with no role ---------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);

select is((select count(*)::int from public.mandirs), 2, 'a member sees listed mandirs');
with u as (update public.mandirs set website = 'https://evil.example' where slug = 'mandir-one' returning 1)
select is(count(*)::int, 0, 'a member cannot edit a mandir') from u;
select is((select count(*)::int from public.mandir_contacts), 0, 'a member sees no contacts');

-- Claims, made by the member
select lives_ok(
  $$insert into public.mandir_claims (mandir_id, role_at_mandir, message)
    values ('10000000-0000-0000-0000-000000000001', 'Secretary', 'Please call the office to check')$$,
  'a member can claim a mandir for themselves');
select throws_ok(
  $$insert into public.mandir_claims (mandir_id, user_id, role_at_mandir)
    values ('20000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', 'Trustee')$$,
  '42501', null, 'a member cannot claim on someone else''s behalf');
select throws_ok(
  $$insert into public.mandir_claims (mandir_id, role_at_mandir, status)
    values ('20000000-0000-0000-0000-000000000002', 'Trustee', 'approved')$$,
  '42501', null, 'a member cannot create an already-approved claim');
select throws_ok(
  $$insert into public.mandir_claims (mandir_id, role_at_mandir)
    values ('10000000-0000-0000-0000-000000000001', 'Secretary')$$,
  '23505', null, 'only one open claim per person per mandir');
select throws_ok(
  $$select public.decide_mandir_claim(
      (select id from public.mandir_claims limit 1), true)$$,
  '42501', null, 'a member cannot approve their own claim');
select is((select count(*)::int from public.mandir_claims), 1, 'a member sees their own claim');

-- Mandir 1's admin ------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);

with u as (update public.mandirs set website = 'https://mandir-one.org' where slug = 'mandir-one' returning 1)
select is(count(*)::int, 1, 'a mandir admin can edit their mandir''s details') from u;
select throws_ok(
  $$update public.mandirs set name = 'Renamed' where slug = 'mandir-one'$$,
  '42501', null, 'a mandir admin cannot rename their mandir');
with u as (update public.mandirs set website = 'https://evil.example' where slug = 'mandir-two' returning 1)
select is(count(*)::int, 0, 'a mandir admin cannot edit another mandir') from u;
select is((select count(*)::int from public.mandir_contacts), 1, 'a mandir admin sees their own contact details');
select is((select count(*)::int from public.mandir_claims), 0, 'a mandir admin cannot see other people''s claims');

-- Mandir 2's admin cannot see mandir 1's contacts
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.mandir_contacts), 0, 'another mandir''s admin sees no contacts of mine');

-- Toran admin ------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated","aal":"aal1"}', true);
with u as (update public.mandirs set name = 'Renamed' where slug = 'mandir-one' returning 1)
select is(count(*)::int, 0, 'a Toran admin without the second factor has no admin powers') from u;

select set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.mandirs), 3, 'a Toran admin sees hidden mandirs too');
select lives_ok(
  $$select public.decide_mandir_claim((select id from public.mandir_claims limit 1), true)$$,
  'a Toran admin can approve a claim');
select throws_ok(
  $$select public.decide_mandir_claim((select id from public.mandir_claims limit 1), false)$$,
  '22023', null, 'a claim cannot be decided twice');

-- The member is now an admin of mandir 1
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);
select is(public.is_mandir_admin('10000000-0000-0000-0000-000000000001'), true,
  'an approved claim makes the person a mandir admin');

select * from finish();
rollback;
