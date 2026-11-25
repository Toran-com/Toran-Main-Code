-- Forwarding to Toran by email (decision 0031): only the site's own code
-- (service_role) can note an email as come in or match its sender to a
-- committee; an email is read once; senders are matched on the confirmed
-- address they log in with; and a mandir's day of emails is counted.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email, email_confirmed_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'One@Example.com', now()),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'two@example.com', null),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'three@example.com', now());
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed'),
  ('10000000-0000-0000-0000-000000000002', 'mandir-two', 'Mandir Two', 'Leicester', 'East Midlands', 'claimed'),
  ('10000000-0000-0000-0000-000000000003', 'mandir-three', 'Mandir Three', 'Leeds', 'Yorkshire', 'hidden');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000003');

set local role anon;
select throws_ok($$ select public.inbound_email_arrived('em_1') $$, '42501', null,
  'visitors can''t note an email');
select throws_ok($$ select * from public.inbound_sender_mandirs('one@example.com') $$, '42501', null,
  'or look up who is on a committee');
reset role;

set local role authenticated;
select throws_ok($$ select * from public.inbound_sender_mandirs('one@example.com') $$, '42501', null,
  'nor can people who are logged in');
select is((select count(*)::int from public.inbound_emails), 0,
  'and they can''t see the emails');
reset role;

set local role service_role;
select ok(public.inbound_email_arrived('em_1'), 'an email comes in');
select ok(not public.inbound_email_arrived('em_1'), 'and is read once, if it comes twice');

select is((select array_agg(slug order by slug) from public.inbound_sender_mandirs(' ONE@example.com ')),
  array['mandir-one', 'mandir-two'], 'a sender''s mandirs, matched whatever the case');
select is((select count(*)::int from public.inbound_sender_mandirs('two@example.com')),
  0, 'not on an address that was never confirmed');
select is((select count(*)::int from public.inbound_sender_mandirs('three@example.com')),
  0, 'only mandirs that are looked after');
select is((select count(*)::int from public.inbound_sender_mandirs('stranger@example.com')),
  0, 'and nothing for a stranger');

update public.inbound_emails set mandir_id = '10000000-0000-0000-0000-000000000001', outcome = 'read'
  where email_id = 'em_1';
insert into public.inbound_emails (email_id, mandir_id, outcome, received_at) values
  ('em_old', '10000000-0000-0000-0000-000000000001', 'read', now() - interval '40 days'),
  ('em_choose', '10000000-0000-0000-0000-000000000001', 'choose', now());
select is((select today from public.inbound_sender_mandirs('one@example.com') where slug = 'mandir-one'),
  1, 'a mandir''s emails read today are counted, not ones it couldn''t read');

select public.inbound_email_arrived('em_2');
select ok(not exists (select 1 from public.inbound_emails where email_id = 'em_old'),
  'emails are forgotten after 30 days');
reset role;

select * from finish();
rollback;
