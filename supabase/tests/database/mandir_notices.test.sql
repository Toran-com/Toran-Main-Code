-- Notices from a committee: anyone sees the current ones of a visible
-- mandir; only its committee (or Toran) posts and removes them, for up to
-- a month ahead, three at once at most.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'committee@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'other@example.com');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed'),
  ('20000000-0000-0000-0000-000000000002', 'mandir-hidden', 'Hidden', 'Leeds', 'North', 'hidden');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');
-- An old one, and one for a hidden mandir.
insert into public.mandir_notices (mandir_id, body, until_on) values
  ('10000000-0000-0000-0000-000000000001', 'Closed last week', current_date - 5),
  ('20000000-0000-0000-0000-000000000002', 'Hidden notice', current_date + 1);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
select lives_ok($$insert into public.mandir_notices (mandir_id, body, until_on)
  values ('10000000-0000-0000-0000-000000000001', 'Closed today because of the snow', current_date)$$,
  'its committee posts a notice');
select throws_ok($$insert into public.mandir_notices (mandir_id, body, until_on)
  values ('10000000-0000-0000-0000-000000000001', 'Far off', current_date + 40)$$,
  '42501', null, 'but not for more than a month ahead');
select throws_ok($$insert into public.mandir_notices (mandir_id, body, until_on)
  values ('10000000-0000-0000-0000-000000000001', 'Yesterday', current_date - 1)$$,
  '42501', null, 'nor ending in the past');
select lives_ok($$insert into public.mandir_notices (mandir_id, body, until_on) values
  ('10000000-0000-0000-0000-000000000001', 'Parking closed', current_date + 2),
  ('10000000-0000-0000-0000-000000000001', 'Aarti at 7pm', current_date + 6)$$,
  'up to three at once');
select throws_ok($$insert into public.mandir_notices (mandir_id, body, until_on)
  values ('10000000-0000-0000-0000-000000000001', 'A fourth', current_date)$$,
  '23514', 'Three notices at once is the most', 'not a fourth');

select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$insert into public.mandir_notices (mandir_id, body, until_on)
  values ('10000000-0000-0000-0000-000000000001', 'Not mine', current_date)$$,
  '42501', null, 'someone else can''t post one');
delete from public.mandir_notices where body = 'Parking closed';
reset role;
select is((select count(*)::int from public.mandir_notices where body = 'Parking closed'),
  1, 'nor remove one');

-- A visitor -------------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is((select count(*)::int from public.mandir_notices
    where mandir_id = '10000000-0000-0000-0000-000000000001'),
  3, 'visitors see the current notices');
select is((select count(*)::int from public.mandir_notices where body = 'Closed last week'),
  0, 'not old ones');
select is((select count(*)::int from public.mandir_notices where body = 'Hidden notice'),
  0, 'nor a hidden mandir''s');

select * from finish();
rollback;
