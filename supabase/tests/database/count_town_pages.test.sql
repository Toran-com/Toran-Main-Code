-- Visits to a festival season's page for a town are counted, but only for
-- towns with a listed mandir.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Milton Keynes', 'South East', 'listed'),
  ('20000000-0000-0000-0000-000000000002', 'mandir-two', 'Mandir Two', 'Hiddenford', 'North', 'hidden');

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select lives_ok($$select public.count_visit('view', p) from (values
    ('/diwali/milton-keynes'),
    ('/navratri/milton-keynes'),
    ('/diwali/nowhere'),
    ('/diwali/hiddenford'),
    ('/easter/milton-keynes')
  ) v (p)$$, 'town pages can be counted');

reset role;
select is((select count from public.daily_counts where path = '/diwali/milton-keynes'), 1,
  'a town with a mandir is counted');
select is((select count(*)::int from public.daily_counts
    where path in ('/diwali/nowhere', '/diwali/hiddenford', '/easter/milton-keynes')), 0,
  'made-up towns, towns of hidden mandirs and other pages aren''t');
select is((select count(*)::int from public.daily_counts), 2, 'two pages counted');

select * from finish();
rollback;
