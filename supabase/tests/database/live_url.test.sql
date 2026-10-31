-- A mandir's "Watch live" link: its committee can set it, and only a web
-- address of sensible length is kept.
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
  $$update public.mandirs set live_url = 'https://www.youtube.com/@mandirone/live'
    where id = '10000000-0000-0000-0000-000000000001'$$,
  'the committee can set the link');
select throws_ok(
  $$update public.mandirs set live_url = 'javascript:alert(1)'
    where id = '10000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'only a web address is kept');
select throws_ok(
  $$update public.mandirs set live_url = 'https://example.org/' || repeat('x', 300)
    where id = '10000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'a link over 300 characters is refused');

select * from finish();
rollback;
