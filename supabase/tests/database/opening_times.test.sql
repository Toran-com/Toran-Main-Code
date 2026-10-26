-- Opening and aarti times: the committee can set them; badly formed
-- times are refused.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

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
  $$update public.mandirs set
      opening_hours = '[{"day": 1, "opens": "07:30", "closes": "12:00"},
                        {"day": 1, "opens": "16:00", "closes": "20:00"}]',
      aarti_times = '[{"name": "Mangla aarti", "time": "07:30"}]'
    where slug = 'mandir-one'$$,
  'the committee sets its times');
select is(
  (select opening_hours -> 1 ->> 'opens' from public.mandirs where slug = 'mandir-one'),
  '16:00', 'and visitors see them');
select lives_ok(
  $$update public.mandirs set opening_hours = null, aarti_times = null where slug = 'mandir-one'$$,
  'times can be taken off again');
select throws_ok(
  $$update public.mandirs set opening_hours = '[{"day": 8, "opens": "07:30", "closes": "12:00"}]'
    where slug = 'mandir-one'$$,
  '23514', null, 'not a day that doesn''t exist');
select throws_ok(
  $$update public.mandirs set opening_hours = '[{"day": 2, "opens": "20:00", "closes": "07:00"}]'
    where slug = 'mandir-one'$$,
  '23514', null, 'not closing before it opens');
select throws_ok(
  $$update public.mandirs set opening_hours = '[{"day": 2, "opens": "7.30", "closes": "12:00"}]'
    where slug = 'mandir-one'$$,
  '23514', null, 'not a time that isn''t HH:MM');
select throws_ok(
  $$update public.mandirs set aarti_times = '[{"name": "", "time": "07:30"}]'
    where slug = 'mandir-one'$$,
  '23514', null, 'an aarti needs a name');

select * from finish();
rollback;
