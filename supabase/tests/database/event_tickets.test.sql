-- Tickets and cost on events: the committee sets them when editing, they
-- stay as they were when an edit doesn't mention them, and only a web
-- address is kept as the booking link.
begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');
insert into public.events (id, mandir_id, title, starts_at, status) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Diwali dinner', '2030-11-01 18:00+00', 'published');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "aaaaaaaa-0000-0000-0000-000000000001", "role": "authenticated"}', true);

select lives_ok(
  $$select public.edit_event('20000000-0000-0000-0000-000000000001',
    '{"title": "Diwali dinner", "starts_at": "2030-11-01T18:00:00Z",
      "cost_note": "£15 adults, children free", "tickets_needed": true,
      "tickets_url": "https://example.org/diwali-dinner"}'::jsonb,
    '{}', '2030-01-01T00:00:00Z')$$,
  'the committee sets the cost and tickets');
select is(
  (select row(cost_note, tickets_needed, tickets_url)::text from public.events
    where id = '20000000-0000-0000-0000-000000000001'),
  row('£15 adults, children free', true, 'https://example.org/diwali-dinner')::text,
  'they are saved');

select lives_ok(
  $$select public.edit_event('20000000-0000-0000-0000-000000000001',
    '{"title": "Diwali dinner and fireworks", "starts_at": "2030-11-01T18:00:00Z"}'::jsonb,
    '{}', '2030-01-01T00:00:00Z')$$,
  'an edit that leaves them out');
select is(
  (select row(cost_note, tickets_needed, tickets_url)::text from public.events
    where id = '20000000-0000-0000-0000-000000000001'),
  row('£15 adults, children free', true, 'https://example.org/diwali-dinner')::text,
  'keeps them as they were');

select throws_ok(
  $$update public.events set tickets_url = 'javascript:alert(1)'
    where id = '20000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'only a web address is kept as the booking link');
select throws_ok(
  $$update public.events set cost_note = repeat('x', 81)
    where id = '20000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'the cost stays short');

select * from finish();
rollback;
