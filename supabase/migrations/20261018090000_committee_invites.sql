-- A committee member invites a colleague to help run their mandir's page.
-- The invite holds only the colleague's email address, for 14 days. They
-- log in with that address and accept on their account page, which adds
-- them to mandir_admins and deletes the invite. Toran sends no email: the
-- committee member tells their colleague themselves.

create table public.mandir_invites (
  id uuid primary key default gen_random_uuid(),
  mandir_id uuid not null references public.mandirs (id) on delete cascade,
  email text not null check (
    email = lower(email)
    and length(email) <= 254
    and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  ),
  invited_by uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  unique (mandir_id, email)
);

create index mandir_invites_email_idx on public.mandir_invites (email);

comment on table public.mandir_invites is
  'Invites to help run a mandir''s page: the colleague''s email only. Deleted when accepted, declined, cancelled or 14 days old.';

alter table public.mandir_invites enable row level security;
revoke all on public.mandir_invites from anon, authenticated;
-- Changes go through the functions below.
grant select on public.mandir_invites to authenticated;

-- The signed-in person's own email address, lower case.
create or replace function public.my_email()
returns text
language sql
stable
set search_path = ''
as $$
  select lower(coalesce((select auth.jwt()) ->> 'email', ''));
$$;

revoke all on function public.my_email() from public, anon;
grant execute on function public.my_email() to authenticated;

create policy "The committee, the person invited, and Toran admins see invites"
  on public.mandir_invites for select to authenticated
  using (
    public.is_mandir_admin(mandir_id)
    or public.is_toran_admin()
    or (email = public.my_email() and expires_at > now())
  );

-- Accepting an invite or the last person leaving changes the mandir's
-- status ("claimed" or back to "listed"). Those changes come from the
-- functions below, which run as their owner, so let them through; changes
-- made directly by a signed-in person are checked as before.
create or replace function public.guard_mandir_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_toran_admin()
     or (select auth.role()) is distinct from 'authenticated'
     or current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if new.name is distinct from old.name
     or new.slug is distinct from old.slug
     or new.town is distinct from old.town
     or new.region is distinct from old.region
     or new.status is distinct from old.status then
    raise exception 'Only Toran admins can change a mandir''s name, address area or status'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Invite someone. Only the mandir's committee (or a Toran admin). Asking
-- again renews the invite. Returns the invite's id.
create or replace function public.invite_committee_member(target uuid, invitee text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  address text := lower(trim(invitee));
  invite uuid;
begin
  if not (public.is_mandir_admin(target) or public.is_toran_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if length(address) > 254 or address !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'email' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.mandir_admins a
      join auth.users u on u.id = a.user_id
      where a.mandir_id = target and lower(u.email) = address
  ) then
    raise exception 'member' using errcode = '22023';
  end if;

  delete from public.mandir_invites where expires_at <= now();
  if (
    select count(*) from public.mandir_invites
      where mandir_id = target and email <> address
  ) >= 5 then
    raise exception 'too_many' using errcode = '22023';
  end if;

  insert into public.mandir_invites (mandir_id, email, invited_by)
    values (target, address, (select auth.uid()))
    on conflict (mandir_id, email) do update
      set invited_by = excluded.invited_by,
          created_at = now(),
          expires_at = now() + interval '14 days'
    returning id into invite;
  return invite;
end;
$$;

-- Accept an invite sent to the signed-in person's email address. Returns
-- the mandir's slug.
create or replace function public.accept_committee_invite(invite uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  i public.mandir_invites;
  target_slug text;
begin
  delete from public.mandir_invites where expires_at <= now();
  select * into i from public.mandir_invites
    where id = invite and email = public.my_email() and expires_at > now()
    for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  insert into public.mandir_admins (mandir_id, user_id, added_by)
    values (i.mandir_id, (select auth.uid()), i.invited_by)
    on conflict do nothing;
  update public.mandirs set status = 'claimed'
    where id = i.mandir_id and status = 'listed'
    returning slug into target_slug;
  delete from public.mandir_invites where id = invite;
  if target_slug is null then
    select slug into target_slug from public.mandirs where id = i.mandir_id;
  end if;
  return target_slug;
end;
$$;

-- Say no to an invite (the person invited), or cancel it (the committee).
create or replace function public.drop_committee_invite(invite uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.mandir_invites where expires_at <= now() and id <> invite;
  delete from public.mandir_invites i
    where i.id = invite
      and (
        i.email = public.my_email()
        or public.is_mandir_admin(i.mandir_id)
        or public.is_toran_admin()
      );
  return found;
end;
$$;

-- Who runs the mandir, for its committee: login email, when added, and
-- whether the person asking added them.
create or replace function public.committee_members(target uuid)
returns table (user_id uuid, email text, added_at timestamptz, added_by_me boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_mandir_admin(target) or public.is_toran_admin()) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  return query
    select a.user_id, u.email::text, a.added_at,
      a.added_by is not distinct from (select auth.uid())
    from public.mandir_admins a
    join auth.users u on u.id = a.user_id
    where a.mandir_id = target
    order by a.added_at;
end;
$$;

-- Take someone off the committee: yourself (leaving), someone you added,
-- or anyone if you're a Toran admin. When nobody is left, the mandir goes
-- back to "listed" so it can be claimed again.
create or replace function public.remove_committee_member(target uuid, member uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.mandir_admins a
    where a.mandir_id = target
      and a.user_id = member
      and (
        member = (select auth.uid())
        or (public.is_mandir_admin(target) and a.added_by = (select auth.uid()))
        or public.is_toran_admin()
      );
  if not found then
    return false;
  end if;
  if not exists (select 1 from public.mandir_admins where mandir_id = target) then
    update public.mandirs set status = 'listed' where id = target and status = 'claimed';
  end if;
  return true;
end;
$$;

revoke all on function public.invite_committee_member(uuid, text) from public, anon;
revoke all on function public.accept_committee_invite(uuid) from public, anon;
revoke all on function public.drop_committee_invite(uuid) from public, anon;
revoke all on function public.committee_members(uuid) from public, anon;
revoke all on function public.remove_committee_member(uuid, uuid) from public, anon;
grant execute on function public.invite_committee_member(uuid, text) to authenticated;
grant execute on function public.accept_committee_invite(uuid) to authenticated;
grant execute on function public.drop_committee_invite(uuid) to authenticated;
grant execute on function public.committee_members(uuid) to authenticated;
grant execute on function public.remove_committee_member(uuid, uuid) to authenticated;
