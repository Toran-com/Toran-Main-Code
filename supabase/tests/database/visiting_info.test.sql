-- Visiting information: the committee ticks what the mandir has; only
-- known ticks are kept, and the note stays short.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');

select is(
  (select facilities from public.mandirs where slug = 'mandir-one'), '{}'::text[],
  'a mandir starts with nothing ticked');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "aaaaaaaa-0000-0000-0000-000000000001", "role": "authenticated"}', true);

select lives_ok(
  $$update public.mandirs
      set facilities = '{step_free,chairs,jain_food}',
          visiting_note = 'Please cover your head in the inner mandir.'
    where slug = 'mandir-one'$$,
  'the committee ticks what the mandir has');
select is(
  (select facilities from public.mandirs where slug = 'mandir-one'),
  '{step_free,chairs,jain_food}'::text[], 'and visitors see it');
select throws_ok(
  $$update public.mandirs set facilities = '{step_free,helipad}' where slug = 'mandir-one'$$,
  '23514', null, 'an unknown tick is refused');
select throws_ok(
  $$update public.mandirs set visiting_note = repeat('x', 401) where slug = 'mandir-one'$$,
  '23514', null, 'a note over 400 characters is refused');

select * from finish();
rollback;
