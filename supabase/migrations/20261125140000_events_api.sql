-- The events API (decision 0032): a mandir's own website or booking
-- system puts its events on Toran with a key the committee makes. Each
-- event is published as the mandir's own, like one a committee member
-- adds, and the system can change or cancel it later by its own id.

-- A committee's keys. Only a hash of each is kept: the key itself is
-- shown once, when it's made. Up to five working keys per mandir.
create table public.mandir_api_keys (
  id uuid primary key default gen_random_uuid(),
  mandir_id uuid not null references public.mandirs (id) on delete cascade,
  label text not null check (length(trim(label)) between 2 and 60),
  key_hash text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  -- The start of the key, to tell keys apart ("toran_k7Qz").
  prefix text not null check (prefix ~ '^toran_[A-Za-z0-9_-]{4}$'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index mandir_api_keys_mandir on public.mandir_api_keys (mandir_id);

comment on table public.mandir_api_keys is
  'Keys a mandir''s own website or booking system uses to put events on Toran (decision 0032). Only a hash of each key is kept.';

alter table public.mandir_api_keys enable row level security;
revoke all on public.mandir_api_keys from anon, authenticated;
-- Committees see their keys, but never the hashes.
grant select (id, mandir_id, label, prefix, created_by, created_at, last_used_at, revoked_at)
  on public.mandir_api_keys to authenticated;
grant select, insert, update, delete on public.mandir_api_keys to service_role;

create policy "Committees see their mandir's keys"
  on public.mandir_api_keys for select to authenticated
  using (public.is_mandir_admin(mandir_id) or public.is_toran_admin());

-- A committee member makes a key: the hash and the start of a key made in
-- the site's code. Refused for anyone else, or past five working keys.
create or replace function public.create_mandir_api_key(
  target uuid, key_label text, hash text, key_prefix text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  made uuid;
begin
  if not public.is_mandir_admin(target) then
    raise exception 'Not on this committee' using errcode = '42501';
  end if;
  if (select count(*) from public.mandir_api_keys
      where mandir_id = target and revoked_at is null) >= 5 then
    raise exception 'Too many keys' using errcode = 'P0001', hint = 'too_many';
  end if;
  insert into public.mandir_api_keys (mandir_id, label, key_hash, prefix, created_by)
    values (target, trim(key_label), hash, key_prefix, (select auth.uid()))
    returning id into made;
  return made;
end;
$$;

revoke all on function public.create_mandir_api_key(uuid, text, text, text) from public, anon;
grant execute on function public.create_mandir_api_key(uuid, text, text, text) to authenticated;

-- A committee member stops a key working, for good.
create or replace function public.revoke_mandir_api_key(target uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  done integer;
begin
  update public.mandir_api_keys k set revoked_at = now()
    where k.id = target and k.revoked_at is null
      and public.is_mandir_admin(k.mandir_id);
  get diagnostics done = row_count;
  return done = 1;
end;
$$;

revoke all on function public.revoke_mandir_api_key(uuid) from public, anon;
grant execute on function public.revoke_mandir_api_key(uuid) to authenticated;

-- Which mandir a key is for, for the API only (it runs as service_role):
-- null for an unknown or stopped key, or a mandir no longer looked after.
-- Notes when the key was last used (at most once a minute).
create or replace function public.mandir_for_api_key(hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  found jsonb;
  key_id uuid;
begin
  select k.id, jsonb_build_object(
      'key', k.id, 'id', m.id, 'slug', m.slug, 'name', m.name, 'town', m.town)
    into key_id, found
    from public.mandir_api_keys k
    join public.mandirs m on m.id = k.mandir_id
    where k.key_hash = hash and k.revoked_at is null and m.status = 'claimed';
  if key_id is not null then
    update public.mandir_api_keys set last_used_at = now()
      where id = key_id
        and (last_used_at is null or last_used_at < now() - interval '1 minute');
  end if;
  return found;
end;
$$;

revoke all on function public.mandir_for_api_key(text) from public, anon, authenticated;
grant execute on function public.mandir_for_api_key(text) to service_role;

-- The mandir system's own id for each event it put on Toran, so it can
-- change or cancel it later. Removed with the event.
create table public.api_events (
  mandir_id uuid not null references public.mandirs (id) on delete cascade,
  external_id text not null check (external_id ~ '^[A-Za-z0-9._:@-]{1,100}$'),
  event_id uuid not null unique references public.events (id) on delete cascade,
  key_id uuid references public.mandir_api_keys (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (mandir_id, external_id)
);

comment on table public.api_events is
  'Events put on Toran by a mandir''s own system through the events API, with that system''s id for each. No personal data.';

alter table public.api_events enable row level security;
revoke all on public.api_events from anon, authenticated;
grant select on public.api_events to authenticated;
grant select, insert, update, delete on public.api_events to service_role;

create policy "Committees see which events came from their system"
  on public.api_events for select to authenticated
  using (public.is_mandir_admin(mandir_id) or public.is_toran_admin());

-- Events from a mandir's own system are the mandir's.
alter table public.events drop constraint events_origin_check;
alter table public.events add constraint events_origin_check
  check (origin in ('mandir', 'poster', 'website', 'visitor', 'aarti', 'api'));

-- edit_event, as before, and also for the events API (service_role), which
-- has already checked the event is the key's mandir's. An event changed by
-- the mandir's own system is confirmed by it.
create or replace function public.edit_event(
  target uuid,
  details jsonb,
  dates timestamptz[],
  today timestamptz
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner uuid;
  -- The site's own code (the events API), not a person.
  robot boolean := current_user = 'service_role';
  -- How long each date lasts, when the event has an end time.
  span interval := case
    when nullif(details ->> 'ends_at', '') is not null
    then (details ->> 'ends_at')::timestamptz - (details ->> 'starts_at')::timestamptz
  end;
begin
  select mandir_id into owner from public.events
    where id = target and status <> 'removed';
  if owner is null
    or not (robot or public.is_toran_admin() or public.is_mandir_admin(owner)) then
    raise exception 'No such event' using errcode = 'P0002';
  end if;

  update public.events set
    title = details ->> 'title',
    summary = nullif(details ->> 'summary', ''),
    title_gu = nullif(details ->> 'title_gu', ''),
    summary_gu = nullif(details ->> 'summary_gu', ''),
    kind = coalesce(nullif(details ->> 'kind', ''), kind),
    starts_at = (details ->> 'starts_at')::timestamptz,
    ends_at = case when details ? 'ends_at'
      then nullif(details ->> 'ends_at', '')::timestamptz else ends_at end,
    all_day = coalesce((details ->> 'all_day')::boolean, false),
    recurrence = nullif(details ->> 'recurrence', ''),
    cost_note = case when details ? 'cost_note'
      then nullif(details ->> 'cost_note', '') else cost_note end,
    tickets_needed = case when details ? 'tickets_needed'
      then coalesce((details ->> 'tickets_needed')::boolean, false) else tickets_needed end,
    tickets_url = case when details ? 'tickets_url'
      then nullif(details ->> 'tickets_url', '') else tickets_url end,
    location_note = case when details ? 'location_note'
      then nullif(details ->> 'location_note', '') else location_note end,
    venue_name = case when details ? 'venue_name'
      then nullif(details ->> 'venue_name', '') else venue_name end,
    venue_postcode = case when details ? 'venue_postcode'
      then nullif(details ->> 'venue_postcode', '') else venue_postcode end,
    languages = case when details ? 'languages'
      then array(select jsonb_array_elements_text(details -> 'languages'))
      else languages end,
    -- A committee member (or the mandir's own system) editing it is
    -- confirming it; a Toran admin isn't.
    confirmed_at = case when robot or public.is_mandir_admin(owner)
      then now() else confirmed_at end
  where id = target;

  delete from public.event_occurrences
    where event_id = target and starts_at >= today and starts_at <> all (dates);
  insert into public.event_occurrences (event_id, starts_at, ends_at)
    select target, d, d + span from unnest(dates) as d where d >= today
    on conflict (event_id, starts_at) do nothing;
  -- Dates still to come take the new end time (or lose it).
  if details ? 'ends_at' then
    update public.event_occurrences set ends_at = starts_at + span
      where event_id = target and starts_at >= today;
  end if;
end;
$$;
