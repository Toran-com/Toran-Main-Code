-- "Tell us about an event": anyone can send one in; it waits for review.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'listed'),
  ('30000000-0000-0000-0000-000000000003', 'mandir-hidden', 'Hidden Mandir', 'Brent', 'London', 'hidden');

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select lives_ok(
  $$select public.report_event('mandir-one',
    '{"title":"Sharad Purnima garba","date":"2026-10-25","time":"19:30","summary":"Seen on the notice board","link":"https://example.org/poster"}')$$,
  'a visitor can send in an event');
select throws_ok(
  $$select public.report_event('mandir-hidden', '{"title":"Garba","date":"2026-10-25"}')$$,
  'P0002', null, 'not for a hidden mandir');
select throws_ok(
  $$select public.report_event('mandir-one', '{"title":"G","date":"2026-10-25"}')$$,
  '22023', null, 'not without a proper name');
select throws_ok(
  $$select public.report_event('mandir-one', '{"title":"Garba","date":"25 October"}')$$,
  '22023', null, 'not without a proper date');
select throws_ok(
  $$select public.report_event('mandir-one', '{"title":"Garba","date":"2026-10-25","link":"javascript:alert(1)"}')$$,
  '22023', null, 'not with a link that isn''t a web address');
select throws_ok('select * from public.event_claims', '42501', null,
  'visitors still cannot see the review queue');

reset role;
select is(
  (select proposed from public.event_claims where mandir_id = '10000000-0000-0000-0000-000000000001'),
  '{"title":"Sharad Purnima garba","date":"2026-10-25","time":"19:30","summary":"Seen on the notice board","repeat":"none","until":"","from":"visitor","link":"https://example.org/poster"}'::jsonb,
  'it is queued as a report from a visitor, with only the event''s details');
select is(
  (select status from public.event_claims where mandir_id = '10000000-0000-0000-0000-000000000001'),
  'pending', 'and waits for review');

-- Ten waiting is the most for one mandir.
set local role anon;
select public.report_event('mandir-one', format('{"title":"Event %s","date":"2026-11-01"}', n)::jsonb)
  from generate_series(2, 10) as n;
select throws_ok(
  $$select public.report_event('mandir-one', '{"title":"One too many","date":"2026-11-01"}')$$,
  '54000', null, 'no more than ten reports wait for one mandir');

select * from finish();
rollback;
