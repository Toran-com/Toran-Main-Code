-- Mandirs, the people who run each one on Toran, and how they claim it.
-- See docs/architecture.md section 2. Rules for who can see and change what
-- are row-level security policies below, tested in supabase/tests/database.

-- Supabase grants new functions to the public role by default; admin checks
-- are for signed-in people only.
revoke execute on function public.is_toran_admin() from anon;

-- Shared helpers ---------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Calendar traditions decide which date a festival falls on for a mandir.
create type public.calendar_tradition as enum (
  'gujarati', 'north_indian', 'tamil', 'bengali', 'other'
);

-- Mandirs -----------------------------------------------------------------

create table public.mandirs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) between 2 and 160),
  town text not null check (length(trim(town)) between 2 and 80),
  region text not null check (length(trim(region)) between 2 and 80),
  postcode text check (postcode is null or postcode ~ '^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$'),
  latitude double precision check (latitude between 49 and 61),
  longitude double precision check (longitude between -9 and 3),
  tradition text check (length(tradition) <= 120),
  calendar public.calendar_tradition,
  website text check (website is null or website ~ '^https?://'),
  phone text check (length(phone) <= 40),
  charity_number text check (length(charity_number) <= 20),
  status text not null default 'listed'
    check (status in ('listed', 'claimed', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null))
);

comment on table public.mandirs is
  'Every mandir Toran knows about. Public unless hidden at the mandir''s request.';
comment on column public.mandirs.status is
  'listed: on Toran, not claimed; claimed: a committee member manages it; hidden: removed from public view.';

create index mandirs_town_idx on public.mandirs (lower(town));
create index mandirs_region_idx on public.mandirs (region);

create trigger mandirs_updated_at before update on public.mandirs
  for each row execute function public.set_updated_at();

-- Private contact details (never shown publicly) ----------------------------

create table public.mandir_contacts (
  mandir_id uuid primary key references public.mandirs (id) on delete cascade,
  email text check (email is null or email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  notes text check (length(notes) <= 2000),
  updated_at timestamptz not null default now()
);

comment on table public.mandir_contacts is
  'How Toran contacts a mandir''s committee. Never public.';

create trigger mandir_contacts_updated_at before update on public.mandir_contacts
  for each row execute function public.set_updated_at();

-- Who runs which mandir on Toran -------------------------------------------

create table public.mandir_admins (
  mandir_id uuid not null references public.mandirs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  added_by uuid references auth.users (id) on delete set null,
  primary key (mandir_id, user_id)
);

create index mandir_admins_user_idx on public.mandir_admins (user_id);

comment on table public.mandir_admins is
  'Committee members who can manage a mandir''s page and events. Added when a Toran admin approves a claim.';

-- True when the signed-in person runs this mandir on Toran.
create or replace function public.is_mandir_admin(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.mandir_admins
    where mandir_id = target and user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_mandir_admin(uuid) from public, anon;
grant execute on function public.is_mandir_admin(uuid) to authenticated;

-- Claims: "I'm on this mandir's committee" -----------------------------------

create table public.mandir_claims (
  id uuid primary key default gen_random_uuid(),
  mandir_id uuid not null references public.mandirs (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role_at_mandir text not null check (length(trim(role_at_mandir)) between 2 and 80),
  message text check (length(message) <= 500),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null
);

-- One open claim per person per mandir.
create unique index mandir_claims_one_pending
  on public.mandir_claims (mandir_id, user_id) where status = 'pending';
create index mandir_claims_pending_idx on public.mandir_claims (created_at)
  where status = 'pending';

comment on table public.mandir_claims is
  'Requests to manage a mandir. A Toran admin checks them (e.g. by phoning the mandir) before approving.';

-- Approve or reject a claim. Only a Toran admin (with second factor).
create or replace function public.decide_mandir_claim(claim uuid, approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.mandir_claims;
begin
  if not public.is_toran_admin() then
    raise exception 'Only Toran admins can decide claims' using errcode = '42501';
  end if;

  select * into c from public.mandir_claims where id = claim for update;
  if not found then
    raise exception 'No such claim' using errcode = 'P0002';
  end if;
  if c.status <> 'pending' then
    raise exception 'This claim was already decided' using errcode = '22023';
  end if;

  update public.mandir_claims
    set status = case when approve then 'approved' else 'rejected' end,
        decided_at = now(),
        decided_by = (select auth.uid())
    where id = claim;

  if approve then
    insert into public.mandir_admins (mandir_id, user_id, added_by)
      values (c.mandir_id, c.user_id, (select auth.uid()))
      on conflict do nothing;
    update public.mandirs set status = 'claimed'
      where id = c.mandir_id and status = 'listed';
  end if;
end;
$$;

revoke all on function public.decide_mandir_claim(uuid, boolean) from public, anon;
grant execute on function public.decide_mandir_claim(uuid, boolean) to authenticated;

-- Committee members may edit their mandir's practical details, but not its
-- identity (name, slug, town, region) or its status; those need a Toran admin.
create or replace function public.guard_mandir_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_toran_admin() or (select auth.role()) is distinct from 'authenticated' then
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

create trigger mandirs_guard_identity before update on public.mandirs
  for each row execute function public.guard_mandir_identity();

-- Permissions ------------------------------------------------------------

alter table public.mandirs enable row level security;
alter table public.mandir_contacts enable row level security;
alter table public.mandir_admins enable row level security;
alter table public.mandir_claims enable row level security;

revoke all on public.mandirs, public.mandir_contacts, public.mandir_admins,
  public.mandir_claims from anon, authenticated;

grant select on public.mandirs to anon, authenticated;
grant insert, update on public.mandirs to authenticated;
grant select, insert, update on public.mandir_contacts to authenticated;
grant select on public.mandir_admins to authenticated;
grant select, insert on public.mandir_claims to authenticated;

-- mandirs
create policy "Visitors see listed mandirs"
  on public.mandirs for select to anon
  using (status <> 'hidden');

create policy "Signed-in see listed mandirs and hidden ones they run"
  on public.mandirs for select to authenticated
  using (status <> 'hidden' or public.is_toran_admin() or public.is_mandir_admin(id));

create policy "Toran admins add mandirs"
  on public.mandirs for insert to authenticated
  with check (public.is_toran_admin());

create policy "Mandir admins and Toran admins edit mandirs"
  on public.mandirs for update to authenticated
  using (public.is_toran_admin() or public.is_mandir_admin(id))
  with check (public.is_toran_admin() or public.is_mandir_admin(id));

-- mandir_contacts
create policy "Mandir admins and Toran admins see contacts"
  on public.mandir_contacts for select to authenticated
  using (public.is_toran_admin() or public.is_mandir_admin(mandir_id));

create policy "Mandir admins and Toran admins add contacts"
  on public.mandir_contacts for insert to authenticated
  with check (public.is_toran_admin() or public.is_mandir_admin(mandir_id));

create policy "Mandir admins and Toran admins edit contacts"
  on public.mandir_contacts for update to authenticated
  using (public.is_toran_admin() or public.is_mandir_admin(mandir_id))
  with check (public.is_toran_admin() or public.is_mandir_admin(mandir_id));

-- mandir_admins (changed only through decide_mandir_claim or by hand)
create policy "See own admin roles, colleagues, or all if Toran admin"
  on public.mandir_admins for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_mandir_admin(mandir_id)
    or public.is_toran_admin()
  );

-- mandir_claims
create policy "Make a claim for yourself"
  on public.mandir_claims for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and decided_at is null
    and decided_by is null
  );

create policy "See your own claims, or all if Toran admin"
  on public.mandir_claims for select to authenticated
  using (user_id = (select auth.uid()) or public.is_toran_admin());
