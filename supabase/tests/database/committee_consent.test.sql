-- Explicit consent from committee members (DPIA section 5): a request
-- needs it, its time is the database's, approval carries it onto the
-- committee, an invite can't be accepted without it, and members from
-- before it was asked can give it once, for their own place only.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email, email_confirmed_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com', now()),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@example.com', now()),
  ('cccccccc-0000-0000-0000-000000000003', 'c@example.com', now()),
  ('dddddddd-0000-0000-0000-000000000004', 't@example.com', now());
insert into public.toran_admins (user_id) values ('dddddddd-0000-0000-0000-000000000004');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed'),
  ('20000000-0000-0000-0000-000000000002', 'mandir-two', 'Mandir Two', 'Leicester', 'East Midlands', 'listed');
-- A member from before consent was asked.
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');

create temporary table invites (id uuid);
grant select, insert on invites to authenticated;

set local role authenticated;

-- Asking to look after a page -------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated","email":"c@example.com"}', true);
select throws_ok($$insert into public.mandir_claims (mandir_id, role_at_mandir)
    values ('20000000-0000-0000-0000-000000000002', 'Secretary')$$,
  '23514', null, 'a request needs consent');
select lives_ok($$insert into public.mandir_claims (mandir_id, role_at_mandir, consented_at)
    values ('20000000-0000-0000-0000-000000000002', 'Secretary', '2000-01-01')$$,
  'with consent it is sent');
select ok((select consented_at > now() - interval '1 minute' from public.mandir_claims
    where mandir_id = '20000000-0000-0000-0000-000000000002'),
  'the time of consent is the database''s, not what was sent');

-- A Toran admin approves it, and the consent goes with it ----------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"dddddddd-0000-0000-0000-000000000004","role":"authenticated","aal":"aal2"}', true);
select public.decide_mandir_claim((select id from public.pending_mandir_claims() where mandir_slug = 'mandir-two'), true);
reset role;
select isnt((select consented_at from public.mandir_admins
    where mandir_id = '20000000-0000-0000-0000-000000000002'
      and user_id = 'cccccccc-0000-0000-0000-000000000003'), null,
  'approving a request records the consent on the committee');

-- An invite needs consent to accept --------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","email":"a@example.com"}', true);
insert into invites
  select public.invite_committee_member('10000000-0000-0000-0000-000000000001', 'b@example.com');
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated","email":"b@example.com"}', true);
select throws_ok($$select public.accept_committee_invite((select id from invites))$$,
  '22023', 'consent_required', 'an invite can''t be accepted without consent');
select throws_ok($$select public.accept_committee_invite((select id from invites), false)$$,
  '22023', 'consent_required', 'nor with consent refused');
select is(public.accept_committee_invite((select id from invites), true), 'mandir-one',
  'with consent it is accepted');
reset role;
select isnt((select consented_at from public.mandir_admins
    where mandir_id = '10000000-0000-0000-0000-000000000001'
      and user_id = 'bbbbbbbb-0000-0000-0000-000000000002'), null,
  'and the consent is recorded');

-- A member from before consent was asked ------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated","email":"c@example.com"}', true);
select is(public.give_committee_consent('10000000-0000-0000-0000-000000000001'), false,
  'someone not on the committee can''t give consent for it');
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated","email":"a@example.com"}', true);
select is(public.give_committee_consent('10000000-0000-0000-0000-000000000001'), true,
  'a member from before can give it');
select is(public.give_committee_consent('10000000-0000-0000-0000-000000000001'), false,
  'only once');
reset role;
select is((select count(*)::int from public.mandir_admins where consented_at is null), 0,
  'everyone on a committee has now consented');

select * from finish();
rollback;
