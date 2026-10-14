-- Where an event came from, and editing its kind.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');

select lives_ok(
  $$insert into public.events (id, mandir_id, title, starts_at, status, origin) values
    ('e1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
     'Annakut', '2026-11-09 18:00+00', 'published', 'website')$$,
  'an event records where it came from');
select throws_ok(
  $$insert into public.events (mandir_id, title, starts_at, origin) values
    ('10000000-0000-0000-0000-000000000001', 'Garba', now(), 'rumour')$$,
  '23514', null, 'only known origins are allowed');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
select public.edit_event('e1000000-0000-0000-0000-000000000001',
  '{"title":"Annakut darshan","kind":"festival","starts_at":"2026-11-09 18:00+00"}', '{}',
  '2026-10-14 00:00+00');
select is((select kind from public.events where id = 'e1000000-0000-0000-0000-000000000001'),
  'festival', 'editing can change the kind');
select public.edit_event('e1000000-0000-0000-0000-000000000001',
  '{"title":"Annakut darshan","starts_at":"2026-11-09 18:00+00"}', '{}',
  '2026-10-14 00:00+00');
select is((select kind from public.events where id = 'e1000000-0000-0000-0000-000000000001'),
  'festival', 'an edit without a kind keeps the one it had');

select * from finish();
rollback;
