-- A committee's own numbers: its mandir's pages and events only, for its
-- committee and Toran admins, nobody else.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'committee@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'other@example.com'),
  ('dddddddd-0000-0000-0000-000000000004', 'toran@example.com');
insert into public.toran_admins (user_id) values ('dddddddd-0000-0000-0000-000000000004');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'listed'),
  ('20000000-0000-0000-0000-000000000002', 'mandir-one-two', 'Mandir One Two', 'Leeds', 'North', 'listed');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');
insert into public.daily_counts (day, metric, path, count) values
  (current_date, 'view', '/mandirs/mandir-one', 5),
  (current_date - 1, 'view', '/mandirs/mandir-one', 2),
  (current_date, 'calendar', '/mandirs/mandir-one/events/e1000000-0000-0000-0000-000000000001', 3),
  (current_date - 60, 'view', '/mandirs/mandir-one', 100),
  -- Another mandir whose address starts the same way.
  (current_date, 'view', '/mandirs/mandir-one-two', 7),
  (current_date, 'view', '/whats-on', 9);

-- Its committee --------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
select is((
    select sum((p ->> 'count')::int)::int
    from jsonb_array_elements(
      public.mandir_count_summary('10000000-0000-0000-0000-000000000001', current_date - 30) -> 'paths') p
    where p ->> 'metric' = 'view'
  ), 7, 'a committee sees its page''s views in the period');
select is((
    select count(*)::int
    from jsonb_array_elements(
      public.mandir_count_summary('10000000-0000-0000-0000-000000000001', current_date - 30) -> 'paths') p
    where p ->> 'path' not like '/mandirs/mandir-one/%' and p ->> 'path' <> '/mandirs/mandir-one'
  ), 0, 'and nothing of any other page, even one whose address starts the same');
select is((
    select (p ->> 'count')::int
    from jsonb_array_elements(
      public.mandir_count_summary('10000000-0000-0000-0000-000000000001', current_date - 30) -> 'paths') p
    where p ->> 'metric' = 'calendar'
  ), 3, 'its events'' calendar adds');
select is((
    select count(*)::int
    from jsonb_array_elements(
      public.mandir_count_summary('10000000-0000-0000-0000-000000000001', current_date - 30) -> 'days') d
  ), 3, 'and the totals per day and kind (views today and yesterday, calendar adds today)');
select throws_ok($$select public.mandir_count_summary('20000000-0000-0000-0000-000000000002', current_date - 30)$$,
  '42501', 'not_allowed', 'but not another mandir''s');

-- Someone else ------------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$select public.mandir_count_summary('10000000-0000-0000-0000-000000000001', current_date - 30)$$,
  '42501', 'not_allowed', 'others can''t see a mandir''s numbers');

-- A Toran admin ---------------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated","aal":"aal2"}', true);
select is((
    select sum((p ->> 'count')::int)::int
    from jsonb_array_elements(
      public.mandir_count_summary('20000000-0000-0000-0000-000000000002', current_date - 30) -> 'paths') p
  ), 7, 'a Toran admin can see any mandir''s');

-- A visitor ---------------------------------------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$select public.mandir_count_summary('10000000-0000-0000-0000-000000000001', current_date - 30)$$,
  '42501', null, 'visitors can''t call it at all');

select * from finish();
rollback;
