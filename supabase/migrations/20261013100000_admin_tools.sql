-- Toran admin tools: see who looks after a mandir (with their login email,
-- which only the auth schema holds) and remove someone's access. Toran
-- admins with the second factor only.

create or replace function public.mandir_admin_list(target uuid)
returns table (user_id uuid, email text, added_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_toran_admin() then
    raise exception 'Only Toran admins can list mandir admins' using errcode = '42501';
  end if;
  return query
    select a.user_id, u.email::text, a.added_at
    from public.mandir_admins a
    join auth.users u on u.id = a.user_id
    where a.mandir_id = target
    order by a.added_at;
end;
$$;

-- Removes one person's access. When nobody is left, the mandir goes back
-- to "listed" so it can be claimed again.
create or replace function public.remove_mandir_admin(target uuid, member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_toran_admin() then
    raise exception 'Only Toran admins can remove mandir admins' using errcode = '42501';
  end if;
  delete from public.mandir_admins where mandir_id = target and user_id = member;
  if not exists (select 1 from public.mandir_admins where mandir_id = target) then
    update public.mandirs set status = 'listed' where id = target and status = 'claimed';
  end if;
end;
$$;

revoke all on function public.mandir_admin_list(uuid) from public, anon;
revoke all on function public.remove_mandir_admin(uuid, uuid) from public, anon;
grant execute on function public.mandir_admin_list(uuid) to authenticated;
grant execute on function public.remove_mandir_admin(uuid, uuid) to authenticated;
