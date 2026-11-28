-- The events API (decision 0032): only a mandir's committee makes and
-- stops its keys, up to five; nobody can read a key's hash; only the
-- site's own code (service_role) looks a key up, and a stopped key finds
-- nothing; and the site's own code can change an event, confirming it.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'member@example.com'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'stranger@example.com');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$ select public.create_mandir_api_key('10000000-0000-0000-0000-000000000001', 'Site', repeat('a', 64), 'toran_abcd') $$,
  '42501', null, 'visitors can''t make a key');
select throws_ok($$ select public.mandir_for_api_key(repeat('a', 64)) $$,
  '42501', null, 'or look one up');
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$ select public.create_mandir_api_key('10000000-0000-0000-0000-000000000001', 'Site', repeat('a', 64), 'toran_abcd') $$,
  '42501', null, 'someone not on the committee can''t make a key');

select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
select isnt(public.create_mandir_api_key('10000000-0000-0000-0000-000000000001', 'Our website', repeat('a', 64), 'toran_abcd'),
  null, 'a committee member makes a key');
select is((select label from public.mandir_api_keys), 'Our website', 'and sees it');
select throws_ok($$ select key_hash from public.mandir_api_keys $$,
  '42501', null, 'but never its hash');
select throws_ok($$ select public.mandir_for_api_key(repeat('a', 64)) $$,
  '42501', null, 'nor can they look a key up');

select public.create_mandir_api_key('10000000-0000-0000-0000-000000000001', 'Key ' || n, repeat(n::text, 64), 'toran_abc' || n)
  from generate_series(1, 4) as n;
select throws_ok($$ select public.create_mandir_api_key('10000000-0000-0000-0000-000000000001', 'One too many', repeat('f', 64), 'toran_ffff') $$,
  'P0001', null, 'five working keys at most');

select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}', true);
select ok(not public.revoke_mandir_api_key((select id from public.mandir_api_keys where label = 'Key 1')),
  'a stranger can''t stop a key');
select is((select count(*)::int from public.mandir_api_keys), 0, 'or see them');
reset role;

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select is(public.mandir_for_api_key(repeat('a', 64)) ->> 'slug', 'mandir-one',
  'the site''s own code finds the key''s mandir');
select is(public.mandir_for_api_key(repeat('9', 64)), null, 'and nothing for an unknown key');
select isnt((select last_used_at from public.mandir_api_keys where label = 'Our website'), null,
  'and notes when a key was used');

-- The site's own code changes an event it put on the page.
insert into public.events (id, mandir_id, title, starts_at, status, origin) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Diwali', now() + interval '10 days', 'published', 'api');
select lives_ok($$ select public.edit_event('20000000-0000-0000-0000-000000000001',
  jsonb_build_object('title', 'Diwali Lakshmi puja', 'starts_at', now() + interval '10 days', 'all_day', false),
  array[]::timestamptz[], now()) $$, 'the site''s own code can change an event');
select isnt((select confirmed_at from public.events where id = '20000000-0000-0000-0000-000000000001'),
  null, 'which confirms it');
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
select public.revoke_mandir_api_key((select id from public.mandir_api_keys where label = 'Our website'));
reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select is(public.mandir_for_api_key(repeat('a', 64)), null, 'a stopped key finds nothing');
reset role;

select * from finish();
rollback;
