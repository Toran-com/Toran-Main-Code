-- Who can see the admin list, and when someone counts as an admin.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'admin@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'member@example.com');
insert into public.toran_admins (user_id, note)
  values ('11111111-1111-1111-1111-111111111111', 'test admin');

select has_table('public', 'toran_admins', 'toran_admins exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.toran_admins'::regclass),
  'row level security is on'
);

-- The public role sees nothing.
set local role anon;
select throws_ok(
  'select count(*) from public.toran_admins',
  '42501', null, 'anon cannot read the admin list'
);
reset role;

-- A member who is not an admin sees no rows and is not an admin.
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","aal":"aal2"}';
select is((select count(*)::int from public.toran_admins), 0, 'a member sees no admin rows');
select is(public.is_toran_admin(), false, 'a member is not an admin');

-- The admin sees only their own row; counts as admin only with a second factor.
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","aal":"aal1"}';
select is((select count(*)::int from public.toran_admins), 1, 'the admin sees their own row');
select is(public.is_toran_admin(), false, 'an admin without the second factor is not treated as admin');
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","aal":"aal2"}';
select is(public.is_toran_admin(), true, 'an admin with the second factor is treated as admin');

select * from finish();
rollback;
