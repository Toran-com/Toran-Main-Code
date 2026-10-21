-- Inviting a colleague onto a mandir's committee: who may invite, that
-- only the person invited can accept, and who may take people off.
begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

insert into auth.users (id, email, email_confirmed_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com', now()),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@example.com', now()),
  ('cccccccc-0000-0000-0000-000000000003', 'c@example.com', now()),
  -- Signed up but never opened their link, and signed up with a password
  -- (Toran never uses passwords).
  ('eeeeeeee-0000-0000-0000-000000000005', 'u@example.com', null),
  ('ffffffff-0000-0000-0000-000000000006', 'p@example.com', now());
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');

create temporary table invites (id uuid);
grant select, insert on invites to authenticated;
create temporary table unproved (id uuid);
grant select, insert on unproved to authenticated;

set local role authenticated;

-- Someone who doesn't run the mandir --------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated","email":"c@example.com"}', true);
select throws_ok($$select public.invite_committee_member('10000000-0000-0000-0000-000000000001', 'x@example.com')$$,
  '42501', 'not_allowed', 'only the committee can invite');

-- The committee member ------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","email":"a@example.com"}', true);
insert into invites
  select public.invite_committee_member('10000000-0000-0000-0000-000000000001', ' B@Example.com ');
select isnt((select id from invites), null, 'the committee can invite a colleague');
select is((select email from public.mandir_invites), 'b@example.com',
  'the address is kept in lower case');
select throws_ok($$select public.invite_committee_member('10000000-0000-0000-0000-000000000001', 'A@example.com')$$,
  '22023', 'member', 'nobody already on the committee');
select throws_ok($$select public.invite_committee_member('10000000-0000-0000-0000-000000000001', 'not an email')$$,
  '22023', 'email', 'only an email address');
select throws_ok($$insert into public.mandir_invites (mandir_id, email)
    values ('10000000-0000-0000-0000-000000000001', 'z@example.com')$$,
  '42501', null, 'invites are only made through the function');

-- Others can't see or use it ---------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated","email":"c@example.com"}', true);
select is((select count(*)::int from public.mandir_invites), 0, 'others don''t see the invite');
select throws_ok($$select public.accept_committee_invite((select id from invites))$$,
  'P0002', 'not_found', 'nor can they accept it');
select is(public.drop_committee_invite((select id from invites)), false,
  'nor cancel it');

-- The colleague logs in with that address --------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated","email":"b@example.com"}', true);
select is((select count(*)::int from public.mandir_invites), 1, 'the colleague sees their invite');
select is(public.accept_committee_invite((select id from invites)), 'mandir-one',
  'and accepts it');
select ok(public.is_mandir_admin('10000000-0000-0000-0000-000000000001'),
  'they now help run the mandir');
select is((select count(*)::int from public.mandir_invites), 0, 'the invite is gone');
select is(public.remove_committee_member('10000000-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001'), false,
  'they can''t take off the person who invited them');

-- Back to the first committee member --------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","email":"a@example.com"}', true);
select results_eq($$select email, added_by_me from public.committee_members('10000000-0000-0000-0000-000000000001') order by email$$,
  $$values ('a@example.com'::text, false), ('b@example.com'::text, true)$$,
  'the committee sees who is on it and whom they added');
select ok(public.remove_committee_member('10000000-0000-0000-0000-000000000001',
    'bbbbbbbb-0000-0000-0000-000000000002'), 'they can take off someone they added');

-- An address counts only once it's proved ----------------------------------------------
insert into unproved
  select public.invite_committee_member('10000000-0000-0000-0000-000000000001', e)
  from unnest(array['u@example.com', 'p@example.com']) e;
select set_config('request.jwt.claims',
  '{"sub":"eeeeeeee-0000-0000-0000-000000000005","role":"authenticated","email":"u@example.com"}', true);
select is((select count(*)::int from public.mandir_invites), 0,
  'someone who never opened their login link doesn''t see an invite to that address');
select throws_ok($$select public.accept_committee_invite(i.id) from unproved i$$,
  'P0002', 'not_found', 'nor can they accept it');
select set_config('request.jwt.claims',
  '{"sub":"ffffffff-0000-0000-0000-000000000006","role":"authenticated","email":"p@example.com","amr":[{"method":"password","timestamp":1}]}', true);
select throws_ok($$select public.accept_committee_invite(i.id) from unproved i$$,
  'P0002', 'not_found', 'nor can someone who logged in with a password');
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","email":"a@example.com"}', true);
select is((select count(*)::int from unproved i where public.drop_committee_invite(i.id)), 2,
  'the committee cancels those invites');

-- At most five open invites.
select lives_ok($$select public.invite_committee_member('10000000-0000-0000-0000-000000000001', e)
    from unnest(array['1@example.com', '2@example.com', '3@example.com', '4@example.com', '5@example.com']) e$$,
  'five open invites are fine');
select throws_ok($$select public.invite_committee_member('10000000-0000-0000-0000-000000000001', '6@example.com')$$,
  '22023', 'too_many', 'a sixth is not');

-- The committee still can't change the page's status itself.
select throws_ok($$update public.mandirs set status = 'listed'
    where id = '10000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'the committee can''t change the status directly');

-- Leaving: the last one out puts the page back to "listed".
select ok(public.remove_committee_member('10000000-0000-0000-0000-000000000001',
    'aaaaaaaa-0000-0000-0000-000000000001'), 'a committee member can leave');
select is((select status from public.mandirs where id = '10000000-0000-0000-0000-000000000001'),
  'listed', 'with nobody left, the page can be claimed again');

-- An old invite can't be used ----------------------------------------------------------------
reset role;
insert into public.mandir_invites (id, mandir_id, email, expires_at) values
  ('99999999-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001',
   'c@example.com', now() - interval '1 day');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated","email":"c@example.com"}', true);
select throws_ok($$select public.accept_committee_invite('99999999-0000-0000-0000-000000000009')$$,
  'P0002', 'not_found', 'an invite older than 14 days can''t be accepted');

select * from finish();
rollback;
