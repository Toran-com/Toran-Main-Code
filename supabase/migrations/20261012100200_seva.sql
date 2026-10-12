-- Seva rota structure: the roles an event needs and their shifts. Who signs
-- up (personal data) is deliberately not here yet: per decision 0006 it
-- arrives with the rota feature, after ICO registration and the DPIA.

create table public.seva_roles (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null check (length(trim(name)) between 2 and 60),
  description text check (length(description) <= 280),
  needs_dbs boolean not null default false,
  created_at timestamptz not null default now()
);

create index seva_roles_event_idx on public.seva_roles (event_id);

comment on column public.seva_roles.needs_dbs is
  'Marks roles the mandir requires a DBS check for. Toran never holds certificates; checks stay with the mandir.';

create table public.seva_shifts (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.seva_roles (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  needed integer not null check (needed between 1 and 500),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index seva_shifts_role_idx on public.seva_shifts (role_id, starts_at);

alter table public.seva_roles enable row level security;
alter table public.seva_shifts enable row level security;

revoke all on public.seva_roles, public.seva_shifts from anon, authenticated;
grant select on public.seva_roles, public.seva_shifts to anon, authenticated;
grant insert, update, delete on public.seva_roles, public.seva_shifts to authenticated;

-- Anyone who can see the event can see its rota (no personal data here).
create policy "See roles for visible events" on public.seva_roles
  for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_id));

create policy "Mandir admins and Toran admins manage roles" on public.seva_roles
  for all to authenticated
  using (exists (
    select 1 from public.events e where e.id = event_id
      and (public.is_toran_admin() or public.is_mandir_admin(e.mandir_id))))
  with check (exists (
    select 1 from public.events e where e.id = event_id
      and (public.is_toran_admin() or public.is_mandir_admin(e.mandir_id))));

create policy "See shifts for visible roles" on public.seva_shifts
  for select to anon, authenticated
  using (exists (select 1 from public.seva_roles r where r.id = role_id));

create policy "Mandir admins and Toran admins manage shifts" on public.seva_shifts
  for all to authenticated
  using (exists (
    select 1 from public.seva_roles r join public.events e on e.id = r.event_id
      where r.id = role_id
      and (public.is_toran_admin() or public.is_mandir_admin(e.mandir_id))))
  with check (exists (
    select 1 from public.seva_roles r join public.events e on e.id = r.event_id
      where r.id = role_id
      and (public.is_toran_admin() or public.is_mandir_admin(e.mandir_id))));
