-- "Connect your website" (decision 0032): only a mandir's committee
-- connects, changes or stops its website; nobody else sees it; the posters
-- read are the site's own business; and only the site's own code
-- (service_role) lists the websites to read tonight.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'member@example.com'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'stranger@example.com');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed'),
  ('10000000-0000-0000-0000-000000000002', 'mandir-two', 'Mandir Two', 'Leeds', 'Yorkshire', 'claimed');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$ insert into public.website_connections (mandir_id, website, connected_by)
  values ('10000000-0000-0000-0000-000000000001', 'https://one.example/', 'aaaaaaaa-0000-0000-0000-000000000002') $$,
  '42501', null, 'someone not on the committee can''t connect its website');

select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
select lives_ok($$ insert into public.website_connections (mandir_id, website, connected_by)
  values ('10000000-0000-0000-0000-000000000001', 'https://one.example/', 'aaaaaaaa-0000-0000-0000-000000000001') $$,
  'a committee member connects their mandir''s website');
select throws_ok($$ insert into public.website_connections (mandir_id, website, connected_by)
  values ('10000000-0000-0000-0000-000000000002', 'https://two.example/', 'aaaaaaaa-0000-0000-0000-000000000001') $$,
  '42501', null, 'but not another mandir''s');
select is((select auto_publish from public.website_connections), true,
  'what it lists goes live straight away, unless they say otherwise');
update public.website_connections set auto_publish = false;
select is((select auto_publish from public.website_connections), false, 'and they can change that');
select throws_ok($$ select * from public.website_reads $$, '42501', null,
  'the posters read aren''t for committees to list');
select throws_ok($$ select public.website_connections_due(10) $$, '42501', null,
  'nor the websites to read tonight');

select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.website_connections), 0, 'a stranger sees no connection');
reset role;

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select is(public.website_connections_due(10) -> 0 ->> 'slug', 'mandir-one',
  'the site''s own code lists the websites to read');
reset role;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
delete from public.website_connections;
reset role;
select is((select count(*)::int from public.website_connections), 0, 'the committee can stop it');

select * from finish();
rollback;
