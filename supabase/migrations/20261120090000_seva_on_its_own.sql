-- Seva on its own. A committee adds a seva (Kitchen, Parking, Shoes) with
-- its time and how many people it needs, and can link it to one of its
-- events, rather than having to find an event first. So a seva belongs to
-- a mandir, its event is optional, and whether volunteers can take a
-- place on Toran is set for each seva rather than for each event.

alter table public.seva_roles
  add column mandir_id uuid references public.mandirs (id) on delete cascade,
  add column open boolean not null default false;

-- Every seva so far was for an event: it keeps its event, and its event's
-- sign-up setting.
update public.seva_roles r
  set mandir_id = e.mandir_id, open = e.seva_open
  from public.events e
  where e.id = r.event_id;

alter table public.seva_roles
  alter column mandir_id set not null,
  alter column event_id drop not null;

-- If the event goes, the seva stays, on its own.
alter table public.seva_roles
  drop constraint seva_roles_event_id_fkey,
  add constraint seva_roles_event_id_fkey
    foreign key (event_id) references public.events (id) on delete set null;

create index seva_roles_mandir_idx on public.seva_roles (mandir_id);

comment on column public.seva_roles.mandir_id is
  'The mandir asking for this seva.';
comment on column public.seva_roles.event_id is
  'The event this seva is for, if any. Optional: a seva can be on its own.';
comment on column public.seva_roles.open is
  'Whether volunteers can take this seva''s places on Toran (anonymously, decision 0013).';
comment on column public.events.seva_open is
  'No longer used: replaced by seva_roles.open, one for each seva. To be dropped.';

-- A seva can only be linked to an event at its own mandir.
create or replace function public.seva_event_same_mandir()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.event_id is not null and not exists (
    select 1 from public.events e
      where e.id = new.event_id and e.mandir_id = new.mandir_id
  ) then
    raise exception 'That event is at another mandir' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.seva_event_same_mandir() from public, anon, authenticated;

create trigger seva_roles_same_mandir
  before insert or update of event_id, mandir_id on public.seva_roles
  for each row execute function public.seva_event_same_mandir();

-- Who can see and change seva: by its mandir now, not its event.
drop policy "See roles for visible events" on public.seva_roles;
drop policy "Mandir admins and Toran admins manage roles" on public.seva_roles;
drop policy "Mandir admins and Toran admins manage shifts" on public.seva_shifts;
drop policy "Mandir admins and Toran admins see slots" on public.seva_slots;
drop policy "Mandir admins and Toran admins clear slots" on public.seva_slots;

-- Anyone who can see the mandir (and the event, if it's for one) can see
-- the seva: there's no personal data here.
create policy "See seva at visible mandirs" on public.seva_roles
  for select to anon, authenticated
  using (
    exists (select 1 from public.mandirs m where m.id = mandir_id)
    and (event_id is null
      or exists (select 1 from public.events e where e.id = event_id)));

create policy "Mandir admins and Toran admins manage seva" on public.seva_roles
  for all to authenticated
  using (public.is_toran_admin() or public.is_mandir_admin(mandir_id))
  with check (public.is_toran_admin() or public.is_mandir_admin(mandir_id));

create policy "Mandir admins and Toran admins manage shifts" on public.seva_shifts
  for all to authenticated
  using (exists (
    select 1 from public.seva_roles r
      where r.id = role_id
      and (public.is_toran_admin() or public.is_mandir_admin(r.mandir_id))))
  with check (exists (
    select 1 from public.seva_roles r
      where r.id = role_id
      and (public.is_toran_admin() or public.is_mandir_admin(r.mandir_id))));

create policy "Mandir admins and Toran admins see slots" on public.seva_slots
  for select to authenticated
  using (exists (
    select 1 from public.seva_shifts sh
      join public.seva_roles r on r.id = sh.role_id
      where sh.id = shift_id
      and (public.is_toran_admin() or public.is_mandir_admin(r.mandir_id))));

create policy "Mandir admins and Toran admins clear slots" on public.seva_slots
  for delete to authenticated
  using (exists (
    select 1 from public.seva_shifts sh
      join public.seva_roles r on r.id = sh.role_id
      where sh.id = shift_id
      and (public.is_toran_admin() or public.is_mandir_admin(r.mandir_id))));

-- Take a place: only for a seva the committee has opened, at a visible
-- mandir, for an event that's published if it's for one, on a shift that
-- hasn't ended, isn't full and doesn't need a DBS check.
create or replace function public.take_seva_slot(target_shift uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  shift record;
  slot uuid;
begin
  select sh.needed, sh.filled_offline, sh.taken_online, sh.ends_at,
         r.needs_dbs, r.open, r.event_id, e.status,
         m.status as mandir_status
    into shift
    from public.seva_shifts sh
    join public.seva_roles r on r.id = sh.role_id
    join public.mandirs m on m.id = r.mandir_id
    left join public.events e on e.id = r.event_id
    where sh.id = target_shift
    for update of sh;
  if not found
     or not shift.open
     or shift.mandir_status = 'hidden'
     or (shift.event_id is not null and shift.status is distinct from 'published')
     or shift.needs_dbs
     or shift.ends_at <= now() then
    raise exception 'closed' using errcode = 'P0001';
  end if;
  if shift.filled_offline + shift.taken_online >= shift.needed then
    raise exception 'full' using errcode = 'P0001';
  end if;
  insert into public.seva_slots (shift_id) values (target_shift)
    returning id into slot;
  return slot;
end;
$$;

revoke all on function public.take_seva_slot(uuid) from public;
grant execute on function public.take_seva_slot(uuid) to anon, authenticated;
