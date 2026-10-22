-- Toran's own visit counter: anyone can add one for a real public page,
-- nothing else gets counted, and only Toran admins can read the totals.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

insert into auth.users (id, email) values
  ('cccccccc-0000-0000-0000-000000000003', 'c@example.com'),
  ('dddddddd-0000-0000-0000-000000000004', 'toran@example.com');
insert into public.toran_admins (user_id) values ('dddddddd-0000-0000-0000-000000000004');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'listed'),
  ('20000000-0000-0000-0000-000000000002', 'mandir-hidden', 'Hidden', 'Leeds', 'North', 'hidden');
insert into public.events (id, mandir_id, title, starts_at, status) values
  ('e1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Diwali', now() + interval '7 days', 'published');

-- A visitor's browser ------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select lives_ok($$select public.count_visit('view', '/')$$, 'a visitor can be counted');
select lives_ok($$select public.count_visit(m, p) from (values
    ('view', '/'),
    ('view', '/mandirs/mandir-one'),
    ('view', '/mandirs/e1000000'),
    ('view', '/mandirs/mandir-hidden'),
    ('view', '/mandirs/no-such-mandir'),
    ('calendar', '/mandirs/mandir-one/events/e1000000-0000-0000-0000-000000000001'),
    ('view', '/mandirs/mandir-hidden/events/e1000000-0000-0000-0000-000000000001'),
    ('click', '/'),
    ('view', '/Whats-On'),
    ('view', '/manage/mandir-one'),
    (null, null)
  ) v (m, p)$$, 'nothing odd makes it fail');
select lives_ok($$select public.count_visit('view', '/diwali')$$,
  'the Diwali page can be counted');
select lives_ok($$select public.count_visit('view', '/for-mandirs/guide')$$,
  'and the committee guide');
select lives_ok($$select public.count_visit('view', '/seva')$$,
  'and the Seva page');
select throws_ok($$select * from public.daily_counts$$, '42501', null,
  'visitors can''t read the counts');

reset role;
select is((select count from public.daily_counts where metric = 'view' and path = '/'), 2,
  'the same page adds up');
select is((select count from public.daily_counts where path = '/mandirs/mandir-one'), 1,
  'a real mandir page is counted');
select is((select count from public.daily_counts
    where metric = 'calendar' and path = '/mandirs/mandir-one/events/e1000000-0000-0000-0000-000000000001'),
  1, 'an event added to a calendar is counted');
select is((select count(*)::int from public.daily_counts where path like '/mandirs/mandir-hidden%'), 0,
  'hidden mandirs, and events under the wrong mandir, aren''t');
select is((select count(*)::int from public.daily_counts where path = '/mandirs/no-such-mandir'), 0,
  'made-up mandirs aren''t');
select is((select count(*)::int from public.daily_counts where path in ('/mandirs/e1000000', '/manage/mandir-one')), 0,
  'nor other pages');
select is((select count from public.daily_counts where path = '/seva'), 1,
  'the Seva page is counted');
select is((select count(*)::int from public.daily_counts), 6,
  'nor unknown kinds of count or badly written addresses');
select is((select day from public.daily_counts limit 1), (now() at time zone 'Europe/London')::date,
  'counted on today''s UK date');

-- Someone signed in who isn't a Toran admin ------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated","aal":"aal1"}', true);
select is((select count(*)::int from public.daily_counts), 0, 'others see no counts');
select throws_ok($$select public.daily_count_summary(current_date - 30)$$, '42501', 'not_allowed',
  'nor the summary');
select lives_ok($$select public.count_visit('share', '/whats-on')$$,
  'signed-in visitors are counted too');

-- A Toran admin ----------------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated","aal":"aal2"}', true);
select is((public.daily_count_summary(current_date - 30) -> 'days')::text <> '[]', true,
  'a Toran admin gets the summary');
select is((
    select sum((p ->> 'count')::int)::int
    from jsonb_array_elements(public.daily_count_summary(current_date - 30) -> 'paths') p
    where p ->> 'metric' = 'view'
  ), 6, 'with the views added up per page');

select * from finish();
rollback;
