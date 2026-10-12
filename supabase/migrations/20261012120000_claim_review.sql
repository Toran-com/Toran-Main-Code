-- The claim review list for Toran admins: each pending claim with the
-- mandir's public details (to phone and check) and the claimant's login
-- email, which only the auth schema holds. Toran admins only.

create or replace function public.pending_mandir_claims()
returns table (
  id uuid,
  created_at timestamptz,
  role_at_mandir text,
  message text,
  claimant_email text,
  mandir_slug text,
  mandir_name text,
  mandir_town text,
  mandir_website text,
  mandir_phone text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_toran_admin() then
    raise exception 'Only Toran admins can review claims' using errcode = '42501';
  end if;
  return query
    select c.id, c.created_at, c.role_at_mandir, c.message, u.email::text,
           m.slug, m.name, m.town, m.website, m.phone
    from public.mandir_claims c
    join public.mandirs m on m.id = c.mandir_id
    join auth.users u on u.id = c.user_id
    where c.status = 'pending'
    order by c.created_at;
end;
$$;

revoke all on function public.pending_mandir_claims() from public, anon;
grant execute on function public.pending_mandir_claims() to authenticated;
