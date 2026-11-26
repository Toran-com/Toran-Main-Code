-- The weekly committee email (decision 0030): only the digest job
-- (service_role) can see who's due and their addresses, once per mandir per
-- week, not for a committee that joined in the last week, and not to anyone
-- who stopped it.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'one@example.com'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'two@example.com'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'new@example.com'),
  ('dddddddd-0000-0000-0000-000000000004', 'toran@example.com');
insert into public.toran_admins (user_id) values ('dddddddd-0000-0000-0000-000000000004');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed'),
  ('20000000-0000-0000-0000-000000000002', 'mandir-two', 'Mandir Two', 'Leeds', 'North', 'claimed'),
  ('30000000-0000-0000-0000-000000000003', 'mandir-three', 'Mandir Three', 'Derby', 'Midlands', 'listed');
insert into public.mandir_admins (mandir_id, user_id, added_at) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '60 days'),
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', now() - interval '1 day'),
  -- Joined this week: no email yet.
  ('20000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000003', now() - interval '3 days');
insert into public.daily_counts (day, metric, path, count) values
  (current_date - 3, 'view', '/mandirs/mandir-one', 8),
  (current_date - 10, 'view', '/mandirs/mandir-one', 2),
  (current_date - 3, 'view', '/mandirs/mandir-one/events/60000000-0000-0000-0000-000000000001', 4),
  (current_date - 3, 'follow', '/mandirs/mandir-one', 5),
  (current_date - 10, 'follow', '/mandirs/mandir-one', 1);

set local role service_role;
select is(jsonb_array_length(public.committee_digests_due('2026-W47', current_date - 6)),
  1, 'one committee is due: not the one that joined this week, nor a mandir without a committee');
select is((public.committee_digests_due('2026-W47', current_date - 6) -> 0 -> 'mandir' ->> 'slug'),
  'mandir-one', 'the one that joined two months ago');
select is((public.committee_digests_due('2026-W47', current_date - 6) -> 0 -> 'recipients' -> 1 ->> 'email'),
  'two@example.com', 'with every member who wants it, newest last');
select is(jsonb_array_length(public.committee_digests_due('2026-W47', current_date - 6) -> 0 -> 'counts' -> 'days'),
  4, 'with its counts per day for this week and the one before (views and follows)');
select is((public.committee_digests_due('2026-W47', current_date - 6) -> 0 -> 'supporters' ->> 'new_followers')::int,
  5, 'what its page brought this week');
select is((public.committee_digests_due('2026-W47', current_date - 6) -> 0 -> 'supporters_both' ->> 'new_followers')::int,
  6, 'and over both weeks, to compare');

select ok(public.set_committee_email('aaaaaaaa-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001', false), 'a member can stop it');
select is(jsonb_array_length(public.committee_digests_due('2026-W47', current_date - 6) -> 0 -> 'recipients'),
  1, 'and then isn''t sent it');

insert into public.committee_emails_sent (mandir_id, month, recipients)
  values ('10000000-0000-0000-0000-000000000001', '2026-W47', 1);
select is(jsonb_array_length(public.committee_digests_due('2026-W47', current_date - 6)),
  0, 'once sent, not again that week');
select is((public.committee_digests_due('2026-W48', current_date + 1) -> 0 -> 'mandir' ->> 'slug'),
  'mandir-one', 'but again next week');
reset role;

-- Nobody else ------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated","aal":"aal2"}', true);
select throws_ok($$select public.committee_digests_due('2026-W47', current_date)$$,
  '42501', null, 'not even a Toran admin can list the addresses');
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$select public.set_committee_email('aaaaaaaa-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', true)$$,
  '42501', null, 'nor stop or start it for someone, except through the signed link');

select * from finish();
rollback;
