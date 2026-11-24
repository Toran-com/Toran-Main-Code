-- The languages an event is in (decision 0027): only from the list, at
-- most four, and a committee's edit changes them.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'committee@example.com');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('30000000-0000-0000-0000-000000000001', 'lang-mandir', 'Lang Mandir', 'Harrow', 'London', 'claimed');
insert into public.mandir_admins (mandir_id, user_id) values
  ('30000000-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001');
insert into public.events (id, mandir_id, title, starts_at, status) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
   'Katha', now() + interval '3 days', 'published');

select is((select languages from public.events where title = 'Katha'), '{}'::text[],
  'an event says no language until it''s given');
select throws_ok(
  $$update public.events set languages = '{gu,xx}' where title = 'Katha'$$,
  '23514', null, 'only languages on the list');
select throws_ok(
  $$update public.events set languages = '{en,gu,hi,ta,pa}' where title = 'Katha'$$,
  '23514', null, 'at most four');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-0000-0000-0000-000000000001","role":"authenticated"}', true);
select public.edit_event(
  '40000000-0000-0000-0000-000000000001',
  jsonb_build_object('title', 'Katha', 'starts_at', (now() + interval '3 days')::text,
                     'languages', jsonb_build_array('gu', 'en')),
  '{}', now());
select is((select languages from public.events where title = 'Katha'), '{gu,en}'::text[],
  'the committee''s edit sets them');
select public.edit_event(
  '40000000-0000-0000-0000-000000000001',
  jsonb_build_object('title', 'Katha', 'starts_at', (now() + interval '3 days')::text),
  '{}', now());
select is((select languages from public.events where title = 'Katha'), '{gu,en}'::text[],
  'an edit that doesn''t mention them leaves them');
select public.edit_event(
  '40000000-0000-0000-0000-000000000001',
  jsonb_build_object('title', 'Katha', 'starts_at', (now() + interval '3 days')::text,
                     'languages', jsonb_build_array()),
  '{}', now());
select is((select languages from public.events where title = 'Katha'), '{}'::text[],
  'and can clear them');
reset role;

select * from finish();
rollback;
