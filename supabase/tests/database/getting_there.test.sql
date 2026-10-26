-- A mandir's "getting there" note: its committee can write it, and it's
-- kept short.
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "aaaaaaaa-0000-0000-0000-000000000001", "role": "authenticated"}', true);

select lives_ok(
  $$update public.mandirs set getting_there = 'Free parking at the back; enter by the side gate.'
    where id = '10000000-0000-0000-0000-000000000001'$$,
  'the committee can write the note');
select is(
  (select getting_there from public.mandirs where id = '10000000-0000-0000-0000-000000000001'),
  'Free parking at the back; enter by the side gate.',
  'and visitors see it');
select throws_ok(
  $$update public.mandirs set getting_there = repeat('x', 401)
    where id = '10000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'a note over 400 characters is refused');

select * from finish();
rollback;
