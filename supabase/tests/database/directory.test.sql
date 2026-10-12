-- The starting directory and festival dates load, and visitors can see them.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select is((select count(*)::int from public.mandirs), 106, 'the starting directory has 106 mandirs');
select is((select count(*)::int from public.mandirs where status <> 'listed'), 0,
  'every starting mandir is listed and unclaimed');
select is((select count(distinct lower(name || town))::int from public.mandirs), 106,
  'no mandir is listed twice');
select is((select count(*)::int from public.festival_dates where verified), 0,
  'no festival date is marked checked yet');
select is((select count(*)::int from public.festival_dates where source is null), 0,
  'every festival date says where it came from');

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is((select count(*)::int from public.mandirs), 106, 'visitors see the whole directory');
select ok((select count(*) from public.festival_dates fd
  join public.festivals f on f.id = fd.festival_id where f.slug = 'diwali') >= 1,
  'visitors see Diwali''s date');

select * from finish();
rollback;
