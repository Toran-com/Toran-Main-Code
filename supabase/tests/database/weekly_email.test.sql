-- The weekly email's sign-ups: nobody can read them, signing up says the
-- same thing either way, the links work only with their codes, and
-- sign-ups never confirmed are deleted after a week.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select lives_ok(
  $$select public.subscribe_digest('Asha@Example.com ', 'London',
      repeat('a', 64), repeat('b', 64))$$,
  'a visitor signs up');
select lives_ok(
  $$select public.subscribe_digest('asha@example.com', '',
      repeat('c', 64), repeat('d', 64))$$,
  'signing up again says nothing about whether they were already there');
select throws_ok('select * from public.digest_subscribers', '42501', null,
  'visitors can''t read the list');
select throws_ok(
  $$select public.subscribe_digest('not an address', '', repeat('e', 64), repeat('f', 64))$$,
  '23514', null, 'an address that isn''t one is refused');

select is(public.confirm_digest(repeat('a', 64)), false,
  'the first confirmation link was replaced by the second');
select is(public.confirm_digest(repeat('c', 64)), true, 'the latest one confirms');
select is(public.unsubscribe_digest(repeat('9', 64)), false,
  'a made-up unsubscribe code does nothing');

reset role;
select is(
  (select region from public.digest_subscribers where email = 'asha@example.com'),
  null, 'one row, with the latest choice of region (all of the UK)');
select isnt(
  (select confirmed_at from public.digest_subscribers where email = 'asha@example.com'),
  null, 'and confirmed');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}', true);
select lives_ok(
  $$select public.subscribe_digest('asha@example.com', 'Wales',
      repeat('e', 64), repeat('b', 64))$$,
  'someone types in the same address again');
select throws_ok('select * from public.digest_subscribers', '42501', null,
  'signed-in people can''t read it either');
select is(public.unsubscribe_digest(repeat('b', 64)), true, 'the unsubscribe link works');

reset role;
select is(
  (select region from public.digest_subscribers where email = 'asha@example.com'),
  null, 'but can''t change what a confirmed address gets');
insert into public.digest_subscribers (email, confirm_hash, unsubscribe_hash, created_at)
  values ('old@example.com', repeat('1', 64), repeat('2', 64), now() - interval '8 days');
select is((public.run_retention() ->> 'unconfirmed_digest')::int, 1,
  'sign-ups never confirmed are deleted after a week');

select * from finish();
rollback;
