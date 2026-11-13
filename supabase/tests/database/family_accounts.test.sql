-- Family accounts (decision 0020): nothing is saved without the family's
-- explicit consent, timed by the database; each family sees and changes
-- only its own saved lists; the lists have limits; families can close
-- their own account, but not someone who runs a mandir; old lists are
-- cleaned up.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email, email_confirmed_at) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'family-a@example.com', now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'family-b@example.com', now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'committee@example.com', now());
insert into public.mandirs (id, name, slug, town, region, status)
  values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Test Mandir', 'test-mandir-family', 'Testford', 'Wales', 'listed');
insert into public.mandir_admins (mandir_id, user_id)
  values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'cccccccc-cccc-cccc-cccc-cccccccccccc');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.family_saved'::regclass),
  'row level security is on'
);

-- Nobody logged out can read them.
set local role anon;
select throws_ok('select count(*) from public.family_saved', '42501', null,
  'anon cannot read saved lists');
reset role;

-- Family A can't save anything without agreeing first.
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';
select throws_ok(
  $$insert into public.family_saved (following) values ('{shree-sample-mandir-anytown}')$$,
  '23502', null, 'nothing is saved without consent'
);

-- Having agreed, it saves its lists. The time of consent is the
-- database's, whatever the browser says.
select lives_ok(
  $$insert into public.family_saved (following, plan, consented_at)
    values ('{shree-sample-mandir-anytown}', '[{"id":"18e01f23-0b51-4b19-bcea-8e68457f7a50","at":"2027-01-01T18:00:00Z"}]', '2020-01-01')$$,
  'a family that agreed saves its own lists'
);
select is((select count(*)::int from public.family_saved), 1, 'and sees them');
select ok(
  (select consented_at > now() - interval '1 minute' from public.family_saved),
  'the time it agreed is recorded by the database'
);
update public.family_saved set consented_at = '2020-01-01';
select ok(
  (select consented_at > now() - interval '1 minute' from public.family_saved),
  'and cannot be changed'
);
select throws_ok(
  $$insert into public.family_saved (user_id, following, consented_at)
    values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '{x}', now())$$,
  '42501', null, 'but cannot save lists for someone else'
);
select throws_ok(
  $$update public.family_saved set following = (select array_agg('m' || g) from generate_series(1, 31) g)$$,
  '23514', null, 'at most 30 mandirs'
);

-- Family B sees nothing of A's.
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}';
select is((select count(*)::int from public.family_saved), 0, 'another family sees nothing');
update public.family_saved set following = '{}';
delete from public.family_saved;
reset role;
select is(
  (select cardinality(following) from public.family_saved
   where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 1,
  'and cannot change or delete them'
);

-- Someone who runs a mandir can't close their account from the site.
set local role authenticated;
set local request.jwt.claims = '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc"}';
select is(public.delete_my_family_account(), false, 'a committee member is refused');
reset role;
select is((select count(*)::int from auth.users where email = 'committee@example.com'), 1,
  'and their account stays');

-- A family can, and its lists go with it.
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';
select is(public.delete_my_family_account(), true, 'a family closes its account');
reset role;
select is((select count(*)::int from public.family_saved
  where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0, 'and its saved lists are gone');

-- Lists untouched for 2 years are cleaned up at night.
insert into public.family_saved (user_id, following, updated_at, consented_at)
  values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '{x}', now() - interval '25 months', now());
select is((public.run_retention() ->> 'family_saved')::int, 1,
  'old saved lists are deleted by the nightly clean-up');

select * from finish();
rollback;
