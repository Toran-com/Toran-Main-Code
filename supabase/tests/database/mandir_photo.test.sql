-- A mandir's photo: its committee can put files in its own folder only,
-- and the page can only point at a photo in its own folder.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.com');
insert into public.mandirs (id, slug, name, town, region, status) values
  ('10000000-0000-0000-0000-000000000001', 'mandir-one', 'Mandir One', 'Harrow', 'London', 'claimed'),
  ('10000000-0000-0000-0000-000000000002', 'mandir-two', 'Mandir Two', 'Leeds', 'Yorkshire and the Humber', 'listed');
insert into public.mandir_admins (mandir_id, user_id) values
  ('10000000-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "aaaaaaaa-0000-0000-0000-000000000001", "role": "authenticated"}', true);

select lives_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('mandir-photos', '10000000-0000-0000-0000-000000000001/abc123def-640.jpg')$$,
  'the committee can add a photo to its own mandir''s folder');
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('mandir-photos', '10000000-0000-0000-0000-000000000002/abc123def-640.jpg')$$,
  '42501', null, 'but not to another mandir''s');
select throws_ok(
  $$insert into storage.objects (bucket_id, name)
    values ('mandir-photos', 'not-a-mandir/abc123def-640.jpg')$$,
  '42501', null, 'or anywhere else in the bucket');

select lives_ok(
  $$update public.mandirs set photo_path = '10000000-0000-0000-0000-000000000001/abc123def'
    where id = '10000000-0000-0000-0000-000000000001'$$,
  'its page can show the photo');
select throws_ok(
  $$update public.mandirs set photo_path = '10000000-0000-0000-0000-000000000002/abc123def'
    where id = '10000000-0000-0000-0000-000000000001'$$,
  '23514', null, 'but not one from another mandir''s folder');

select * from finish();
rollback;
