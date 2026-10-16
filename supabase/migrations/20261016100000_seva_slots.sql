-- Volunteers can take a seva slot on Toran without giving a name
-- (decision 0013). Toran keeps how many slots are taken, never who took
-- them. Each slot taken online is a row with a random id that only the
-- volunteer's phone knows, so they can give it back; there is no name,
-- contact detail, IP address or device detail.

-- The committee turns online sign-up on per event. Off until they do.
alter table public.events
  add column seva_open boolean not null default false;

comment on column public.events.seva_open is
  'Whether volunteers can take this event''s seva slots on Toran (anonymously). Off by default.';

-- Two counts per shift: people the committee has added itself (for
-- example from WhatsApp replies), and slots taken on Toran. The second is
-- kept in step with seva_slots by a trigger.
alter table public.seva_shifts
  add column filled_offline integer not null default 0
    check (filled_offline between 0 and 500),
  add column taken_online integer not null default 0
    check (taken_online >= 0);

comment on column public.seva_shifts.filled_offline is
  'People the committee has counted in itself, e.g. from WhatsApp replies. A number only.';
comment on column public.seva_shifts.taken_online is
  'Slots taken on Toran: the number of seva_slots rows. Kept by a trigger.';

-- Committees can set their own count but not the online one, so the two
-- can't drift apart.
revoke insert, update on public.seva_shifts from authenticated;
grant insert (role_id, starts_at, ends_at, needed, filled_offline)
  on public.seva_shifts to authenticated;
grant update (starts_at, ends_at, needed, filled_offline)
  on public.seva_shifts to authenticated;

create table public.seva_slots (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.seva_shifts (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index seva_slots_shift_idx on public.seva_slots (shift_id);

comment on table public.seva_slots is
  'One row per seva slot taken on Toran. No personal data: the id is random and known only to the volunteer''s phone, so they can give the slot back.';

alter table public.seva_slots enable row level security;
revoke all on public.seva_slots from anon, authenticated;
-- Taking and giving back go through the functions below. The committee
-- can see when slots were taken and clear them (say, if someone fills a
-- rota for a joke).
grant select, delete on public.seva_slots to authenticated;

create policy "Mandir admins and Toran admins see slots" on public.seva_slots
  for select to authenticated
  using (exists (
    select 1 from public.seva_shifts sh
      join public.seva_roles r on r.id = sh.role_id
      join public.events e on e.id = r.event_id
      where sh.id = shift_id
      and (public.is_toran_admin() or public.is_mandir_admin(e.mandir_id))));

create policy "Mandir admins and Toran admins clear slots" on public.seva_slots
  for delete to authenticated
  using (exists (
    select 1 from public.seva_shifts sh
      join public.seva_roles r on r.id = sh.role_id
      join public.events e on e.id = r.event_id
      where sh.id = shift_id
      and (public.is_toran_admin() or public.is_mandir_admin(e.mandir_id))));

create or replace function public.count_seva_slots()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.seva_shifts set taken_online = taken_online + 1
      where id = new.shift_id;
  else
    update public.seva_shifts set taken_online = greatest(taken_online - 1, 0)
      where id = old.shift_id;
  end if;
  return null;
end;
$$;

create trigger seva_slots_count after insert or delete on public.seva_slots
  for each row execute function public.count_seva_slots();

-- Take a slot: only on a published event at a visible mandir whose
-- committee has turned sign-up on, for a shift that hasn't ended, isn't
-- full and doesn't need a DBS check (the mandir must know who does those).
-- Returns the slot's random id, for giving it back.
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
         r.needs_dbs, e.seva_open, e.status, m.status as mandir_status
    into shift
    from public.seva_shifts sh
    join public.seva_roles r on r.id = sh.role_id
    join public.events e on e.id = r.event_id
    join public.mandirs m on m.id = e.mandir_id
    where sh.id = target_shift
    for update of sh;
  if not found
     or shift.status <> 'published'
     or shift.mandir_status = 'hidden'
     or not shift.seva_open
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

-- Give a slot back, until the shift has ended. True if it was given back.
create or replace function public.give_back_seva_slot(slot uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.seva_slots s
    using public.seva_shifts sh
    where s.id = slot and sh.id = s.shift_id and sh.ends_at > now();
  return found;
end;
$$;

revoke all on function public.take_seva_slot(uuid) from public;
revoke all on function public.give_back_seva_slot(uuid) from public;
revoke all on function public.count_seva_slots() from public, anon, authenticated;
grant execute on function public.take_seva_slot(uuid) to anon, authenticated;
grant execute on function public.give_back_seva_slot(uuid) to anon, authenticated;
