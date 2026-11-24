-- Followers and asks (decision 0022): Follow, Unfollow and Ask count on a
-- mandir's own page only, I went on an event's page only, as totals with
-- nothing about who. A committee sees its own mandir's, nobody else's.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'committee@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'other@example.com'),
  ('dddddddd-0000-0000-0000-000000000004', 'toran@example.com');
insert into public.toran_admins (user_id) values ('dddddddd-0000-0000-0000-000000000004');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed'),
  ('20000000-0000-0000-0000-000000000002', 'mandir-one-two', 'Mandir One Two', 'Leeds', 'North', 'listed');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');
insert into public.events (id, mandir_id, title, starts_at, status) values
  ('e1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Satsang', now() - interval '1 day', 'published');

-- Anyone can press them ---------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select public.count_visit('follow', '/mandirs/mandir-one');
select public.count_visit('follow', '/mandirs/mandir-one');
select public.count_visit('follow', '/mandirs/mandir-one');
select public.count_visit('unfollow', '/mandirs/mandir-one');
select public.count_visit('ask', '/mandirs/mandir-one');
select public.count_visit('ask', '/mandirs/mandir-one-two');
select public.count_visit('ask', '/mandirs/mandir-one-two');
select public.count_visit('went', '/mandirs/mandir-one/events/e1000000-0000-0000-0000-000000000001');
-- Not where they don't belong.
select public.count_visit('follow', '/whats-on');
select public.count_visit('follow', '/mandirs/mandir-one/events/e1000000-0000-0000-0000-000000000001');
select public.count_visit('went', '/mandirs/mandir-one');
select public.count_visit('ask', '/mandirs/no-such-mandir');
select public.count_visit('like', '/mandirs/mandir-one');
reset role;

select is((select count from public.daily_counts where metric = 'follow' and path = '/mandirs/mandir-one'),
  3, 'Follow counts on a mandir''s page');
select is((select count from public.daily_counts where metric = 'unfollow' and path = '/mandirs/mandir-one'),
  1, 'so does Unfollow');
select is((select count from public.daily_counts where metric = 'went'),
  1, 'I went counts on an event''s page');
select is((select count(*)::int from public.daily_counts where path = '/whats-on' or metric = 'like'),
  0, 'nothing on other pages, nor anything else');
select is((select count(*)::int from public.daily_counts where metric = 'follow' and path like '%/events/%'),
  0, 'no Follow on an event''s page');
select is((select count(*)::int from public.daily_counts where path = '/mandirs/no-such-mandir'),
  0, 'nor for a mandir that doesn''t exist');
select is((select count(*)::int from public.daily_counts where metric = 'went' and path = '/mandirs/mandir-one'),
  0, 'and no I went on a mandir''s page');

-- Last month's, to tell the period from all time.
insert into public.daily_counts (day, metric, path, count) values
  (current_date - 40, 'follow', '/mandirs/mandir-one', 10),
  (current_date - 40, 'ask', '/mandirs/mandir-one', 4);
-- Two seva places taken on Toran today, one 40 days ago.
with role as (
  insert into public.seva_roles (mandir_id, name, open)
    values ('10000000-0000-0000-0000-000000000001', 'Kitchen', true) returning id
), shift as (
  insert into public.seva_shifts (role_id, starts_at, ends_at, needed)
    select id, now() + interval '1 day', now() + interval '1 day 2 hours', 5 from role
    returning id
)
insert into public.seva_slots (shift_id, created_at)
  select id, t from shift, (values (now()), (now()), (now() - interval '40 days')) v (t);

-- Its committee ----------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
select is((public.mandir_supporters('10000000-0000-0000-0000-000000000001', current_date - 27) ->> 'followers')::int,
  12, 'followers: every Follow less every Unfollow, ever');
select is((public.mandir_supporters('10000000-0000-0000-0000-000000000001', current_date - 27) ->> 'new_followers')::int,
  2, 'and those gained in the period');
select is((public.mandir_supporters('10000000-0000-0000-0000-000000000001', current_date - 27) ->> 'asks')::int,
  5, 'asks to post, ever');
select is((public.mandir_supporters('10000000-0000-0000-0000-000000000001', current_date - 27) ->> 'went')::int,
  1, 'I went on its events in the period');
select is((public.mandir_supporters('10000000-0000-0000-0000-000000000001', current_date - 27) ->> 'seva_taken')::int,
  2, 'seva places taken on Toran in the period');
select throws_ok($$select public.mandir_supporters('20000000-0000-0000-0000-000000000002', current_date)$$,
  '42501', 'not_allowed', 'not another mandir''s');
select throws_ok($$select * from public.supporters_by_mandir()$$,
  '42501', 'not_allowed', 'nor the list of every mandir''s');

-- A Toran admin ------------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated","aal":"aal2"}', true);
select results_eq($$select slug, followers, asks from public.supporters_by_mandir()$$,
  $$values ('mandir-one'::text, 12, 5), ('mandir-one-two'::text, 0, 2)$$,
  'a Toran admin sees every mandir''s followers and asks, most asked first');

-- A visitor -----------------------------------------------------------------------------------
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$select public.mandir_supporters('10000000-0000-0000-0000-000000000001', current_date)$$,
  '42501', null, 'visitors can''t see a mandir''s');

select * from finish();
rollback;
