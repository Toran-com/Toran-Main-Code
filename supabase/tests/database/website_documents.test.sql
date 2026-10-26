-- The patrikas and posters found by a website check: a short list, kept
-- with the check's other results.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'listed');
insert into public.sources (id, mandir_id, kind, label) values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'crawler', 'Website');

select lives_ok($$update public.sources set last_documents =
    '[{"url":"https://mandir.example.org/patrika.pdf","kind":"pdf","label":"Diwali patrika"}]'
    where id = '50000000-0000-0000-0000-000000000001'$$,
  'a list of patrikas can be saved');
select throws_ok($$update public.sources set last_documents = '{"url":"x"}'
    where id = '50000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'but only as a list');
select throws_ok($$update public.sources set last_documents =
    (select jsonb_agg(jsonb_build_object('url', 'https://x.example/' || i || '.pdf')) from generate_series(1, 6) i)
    where id = '50000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'of at most five');
select lives_ok($$update public.sources set last_documents = null
    where id = '50000000-0000-0000-0000-000000000001'$$,
  'or none');

select * from finish();
rollback;
