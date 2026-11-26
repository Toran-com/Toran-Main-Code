-- The seva emails (decision 0029): only the site's own code (service_role)
-- sees who's due and their addresses; the evening roundup counts places
-- taken since the last one; "seva full" is told once, and again only
-- after the committee adds places; and a member can stop them.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'one@example.com'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'two@example.com');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed');
insert into public.mandir_admins (mandir_id, user_id, added_at) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', now() - interval '60 days'),
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', now() - interval '1 day');
insert into public.seva_roles (id, mandir_id, name, open) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Kitchen', true),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Car park', true);
insert into public.seva_shifts (id, role_id, starts_at, ends_at, needed) values
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
    now() + interval '2 days', now() + interval '2 days 2 hours', 2),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001',
    now() + interval '3 days', now() + interval '3 days 2 hours', 1),
  ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002',
    now() + interval '2 days', now() + interval '2 days 2 hours', 5);

-- A place taken two days ago: before the first roundup's day.
insert into public.seva_slots (shift_id, created_at) values
  ('60000000-0000-0000-0000-000000000003', now() - interval '2 days');

-- A visitor takes a Kitchen place now.
set local role anon;
select public.take_seva_slot('60000000-0000-0000-0000-000000000001');
reset role;

set local role service_role;
select is(public.seva_full_notice('60000000-0000-0000-0000-000000000001'),
  null, 'Kitchen isn''t full yet: nothing to tell');
select is(jsonb_array_length(public.seva_roundups_due(now() + interval '1 minute')),
  1, 'the mandir is due a roundup');
select is((public.seva_roundups_due(now() + interval '1 minute') -> 0 -> 'seva' -> 0 ->> 'name'),
  'Kitchen', 'for the seva that had a place taken today');
select is(jsonb_array_length(public.seva_roundups_due(now() + interval '1 minute') -> 0 -> 'seva'),
  1, 'not the one whose only place was taken before the last day');
select is((public.seva_roundups_due(now() + interval '1 minute') -> 0 -> 'seva' -> 0 -> 'shifts' -> 0 ->> 'taken')::int,
  1, 'with how each time stands');
select is(jsonb_array_length(public.seva_roundups_due(now() + interval '1 minute') -> 0 -> 'recipients'),
  2, 'to every committee member');

select ok(public.set_seva_email('aaaaaaaa-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001', false), 'a member can stop the seva emails');
select is(jsonb_array_length(public.seva_roundups_due(now() + interval '1 minute') -> 0 -> 'recipients'),
  1, 'and then isn''t sent them');

insert into public.seva_roundups_sent (mandir_id, through, places, recipients)
  values ('10000000-0000-0000-0000-000000000001', now() + interval '1 minute', 1, 1);
select is(jsonb_array_length(public.seva_roundups_due(now() + interval '2 minutes')),
  0, 'a place is in one roundup only');
reset role;

-- The last Kitchen places are taken.
set local role anon;
select public.take_seva_slot('60000000-0000-0000-0000-000000000001');
select public.take_seva_slot('60000000-0000-0000-0000-000000000002');
reset role;

set local role service_role;
select is((public.seva_full_notice('60000000-0000-0000-0000-000000000002') -> 'seva' ->> 'name'),
  'Kitchen', 'the moment every place is taken, there''s something to tell');
select is(public.seva_full_notice('60000000-0000-0000-0000-000000000001'),
  null, 'but only once');
reset role;

update public.seva_shifts set needed = 2 where id = '60000000-0000-0000-0000-000000000002';
select is((select full_emailed_at from public.seva_roles where id = '50000000-0000-0000-0000-000000000001'),
  null, 'adding places means it can be told again once they fill');

-- Nobody else ------------------------------------------------------------------------------
set local role anon;
select throws_ok($$select public.seva_full_notice('60000000-0000-0000-0000-000000000001')$$,
  '42501', null, 'a visitor can''t ask who to tell');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","aal":"aal1"}', true);
select throws_ok($$select public.seva_roundups_due(now())$$,
  '42501', null, 'nor can a committee member list the addresses');

select * from finish();
rollback;
