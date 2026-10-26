-- The Gujarati review pack: only Toran admins (with the second factor)
-- can see or record which lines have been checked.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email) values
  ('cccccccc-0000-0000-0000-000000000003', 'c@example.com'),
  ('dddddddd-0000-0000-0000-000000000004', 'toran@example.com');
insert into public.toran_admins (user_id) values ('dddddddd-0000-0000-0000-000000000004');
insert into public.translation_checks (key, english, gujarati)
  values ('shell.home', 'Toran home', 'તોરણ મુખ્ય પાનું');

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok('select * from public.translation_checks', '42501', null,
  'visitors cannot read them');

reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is((select count(*)::int from public.translation_checks), 0,
  'other signed-in people see none');
select throws_ok(
  $$insert into public.translation_checks (key, english, gujarati) values ('x', 'a', 'b')$$,
  '42501', null, 'nor record any');

select set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.translation_checks), 0,
  'Toran admins need the second factor');

select set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated","aal":"aal2"}', true);
select is((select count(*)::int from public.translation_checks), 1, 'Toran admins see them');
select lives_ok(
  $$insert into public.translation_checks (key, english, gujarati)
      values ('shell.home', 'Toran home', 'તોરણ હોમ'), ('shell.find', 'Find', 'શોધો')
      on conflict (key) do update set english = excluded.english,
        gujarati = excluded.gujarati, checked_at = now()$$,
  'and record new checks, replacing older ones');
select is((select gujarati from public.translation_checks where key = 'shell.home'),
  'તોરણ હોમ', 'with the text as it is now');

select * from finish();
rollback;
