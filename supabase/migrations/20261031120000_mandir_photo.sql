-- A photo of the mandir, added by its committee (or Toran): shown at the
-- top of its page and in the picture under a shared link. Stored twice,
-- resized in the committee's browser: <path>-640.jpg for phones and
-- <path>-1200.jpg for wider screens and share previews. Photos of the
-- building only, never of people (the form says so, decision 0006).

alter table public.mandirs
  add column photo_path text
    check (
      photo_path ~ '^[0-9a-f-]{36}/[a-z0-9]{6,40}$'
      and split_part(photo_path, '/', 1) = id::text
    );

comment on column public.mandirs.photo_path is
  'The mandir''s photo in the mandir-photos bucket, without its size and .jpg: <mandir id>/<name>.';

-- Public to read (they are on public pages), small, JPEG only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mandir-photos', 'mandir-photos', true, 614400, array['image/jpeg'])
on conflict (id) do nothing;

-- Whether the signed-in person may add or remove a file in this place in
-- the bucket: the folder is a mandir's id, and they help run it or are a
-- Toran admin.
create or replace function public.can_edit_mandir_photo(object_name text)
returns boolean
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  folder text := split_part(object_name, '/', 1);
begin
  if folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.is_toran_admin() or public.is_mandir_admin(folder::uuid);
end;
$$;

revoke all on function public.can_edit_mandir_photo(text) from public, anon;
grant execute on function public.can_edit_mandir_photo(text) to authenticated;

create policy "mandir photos: committees add"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'mandir-photos' and public.can_edit_mandir_photo(name));

create policy "mandir photos: committees replace"
  on storage.objects for update to authenticated
  using (bucket_id = 'mandir-photos' and public.can_edit_mandir_photo(name))
  with check (bucket_id = 'mandir-photos' and public.can_edit_mandir_photo(name));

create policy "mandir photos: committees remove"
  on storage.objects for delete to authenticated
  using (bucket_id = 'mandir-photos' and public.can_edit_mandir_photo(name));
