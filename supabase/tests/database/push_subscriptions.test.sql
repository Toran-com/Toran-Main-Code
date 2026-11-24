-- Phone notifications: a browser saves its push address with the mandirs
-- it follows (only real, visible ones kept), and removes it by the same
-- address. Nobody can read the list but the site's own server code.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'listed'),
  ('20000000-0000-0000-0000-000000000002', 'mandir-hidden', 'Hidden', 'Leeds', 'North', 'hidden');

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select ok(public.save_push_subscription('https://fcm.googleapis.com/fcm/send/abc',
  repeat('B', 87), repeat('a', 22),
  array['mandir-one', 'mandir-hidden', 'no-such-mandir']), 'a visitor turns notifications on');
select throws_ok($$select count(*) from public.push_subscriptions$$,
  '42501', null, 'but can''t read the list');
reset role;
select is((select mandirs from public.push_subscriptions),
  array['mandir-one'], 'only real, visible mandirs are kept');

set local role anon;
select ok(public.save_push_subscription('https://fcm.googleapis.com/fcm/send/abc',
  repeat('B', 87), repeat('a', 22), array[]::text[]), 'following none: kept, with no mandirs');
reset role;
select is((select count(*)::int from public.push_subscriptions), 1, 'the same browser, not a second one');

set local role anon;
select lives_ok($$select public.drop_push_subscription('https://fcm.googleapis.com/fcm/send/abc')$$,
  'turning off');
reset role;
select is((select count(*)::int from public.push_subscriptions), 0, 'deletes it at once');

select * from finish();
rollback;
