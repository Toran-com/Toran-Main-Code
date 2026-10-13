-- Events can carry their name and description in Gujarati too.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed');

select lives_ok(
  $$insert into public.events (mandir_id, title, title_gu, summary_gu, starts_at, status)
    values ('10000000-0000-0000-0000-000000000001', 'Diwali', 'દિવાળી', 'સૌનું સ્વાગત છે.', now() + interval '1 day', 'published')$$,
  'an event can have a Gujarati name and description');
select lives_ok(
  $$insert into public.events (mandir_id, title, starts_at, status)
    values ('10000000-0000-0000-0000-000000000001', 'Aarti', now() + interval '1 day', 'published')$$,
  'Gujarati is optional');
select throws_ok(
  $$insert into public.events (mandir_id, title, title_gu, starts_at)
    values ('10000000-0000-0000-0000-000000000001', 'Diwali', ' ', now())$$,
  '23514', null, 'a blank Gujarati name is refused');
select throws_ok(
  $$insert into public.events (mandir_id, title, summary_gu, starts_at)
    values ('10000000-0000-0000-0000-000000000001', 'Diwali', repeat('ક', 281), now())$$,
  '23514', null, 'a Gujarati description over 280 characters is refused');

select * from finish();
rollback;
