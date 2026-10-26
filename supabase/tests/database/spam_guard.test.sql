-- Spam guard: at most 30 sends an hour of each public form across the
-- whole site, and the same correction twice is only kept once.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into public.mandirs (id, slug, name, town, region, status)
  select format('40000000-0000-0000-0000-%s', lpad(n::text, 12, '0'))::uuid,
    format('mandir-%s', n), format('Mandir %s', n), 'Leicester', 'East Midlands', 'listed'
  from generate_series(1, 4) as n;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

-- 30 reports in an hour, spread so no one mandir has ten waiting.
select public.report_event(format('mandir-%s', n % 4 + 1),
    format('{"title":"Event number %s","date":"2026-11-01"}', n)::jsonb)
  from generate_series(1, 30) as n;
select throws_ok(
  $$select public.report_event('mandir-1', '{"title":"One more","date":"2026-11-02"}')$$,
  '54000', null, 'no more than 30 reports an hour across the site');

reset role;
update public.event_claims set created_at = now() - interval '61 minutes';
set local role anon;
select lives_ok(
  $$select public.report_event('mandir-1', '{"title":"An hour later","date":"2026-11-02"}')$$,
  'an hour later they can be sent again');

-- Corrections.
select lives_ok(
  $$select public.request_correction('wrong', '/mandirs/mandir-1', 'The aarti is at 7pm.')$$,
  'a correction is sent');
select lives_ok(
  $$select public.request_correction('wrong', '/mandirs/mandir-1', '  the aarti is at 7PM.')$$,
  'the same again is thanked');
reset role;
select is((select count(*)::int from public.site_requests), 1, 'but kept only once');
set local role anon;
select lives_ok(
  $$select public.request_correction('wrong', '/mandirs/mandir-2', 'The aarti is at 7pm.')$$,
  'the same words about another page are a new request');

select public.request_correction('other', '/', format('Request number %s', n))
  from generate_series(3, 30) as n;
select throws_ok(
  $$select public.request_correction('other', '/', 'One more')$$,
  '54000', null, 'no more than 30 corrections an hour');
reset role;
select is((select count(*)::int from public.site_requests), 30, 'thirty were kept');

select * from finish();
rollback;
