-- Only a mandir's own committee can mark its events "Confirmed by the
-- mandir"; a Toran admin helping out publishes without confirming.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'committee@example.com'),
  ('dddddddd-0000-0000-0000-000000000004', 'toran@example.com');
insert into public.toran_admins (user_id) values ('dddddddd-0000-0000-0000-000000000004');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');

set local role authenticated;

-- A Toran admin publishing from the committee's page ------------------------------
select set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated","aal":"aal2"}', true);
insert into public.events (id, mandir_id, title, starts_at, status, origin, confirmed_at) values
  ('e1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Sunday feast', now() + interval '3 days', 'published', 'website', now());
select is((select confirmed_at from public.events where id = 'e1000000-0000-0000-0000-000000000001'),
  null, 'a Toran admin publishing an event does not confirm it');
update public.events set confirmed_at = now() where id = 'e1000000-0000-0000-0000-000000000001';
select is((select confirmed_at from public.events where id = 'e1000000-0000-0000-0000-000000000001'),
  null, 'nor can a Toran admin confirm it afterwards');
select lives_ok($$update public.events set title = 'Sunday Love Feast'
    where id = 'e1000000-0000-0000-0000-000000000001'$$,
  'a Toran admin can still correct it');

-- The mandir's committee ---------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
update public.events set confirmed_at = now() where id = 'e1000000-0000-0000-0000-000000000001';
select isnt((select confirmed_at from public.events where id = 'e1000000-0000-0000-0000-000000000001'),
  null, 'the committee can confirm it');
select is((select confirmed_by from public.events where id = 'e1000000-0000-0000-0000-000000000001'),
  'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'and it records who');

-- Website checks keep notes on what they read ---------------------------------------
reset role;
select has_column('public', 'sources', 'last_notes', 'website checks keep notes');

select * from finish();
rollback;
