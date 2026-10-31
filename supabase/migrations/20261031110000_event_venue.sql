-- Events held somewhere other than the mandir: a hired hall, a park, a
-- school. The place's name and postcode, so directions, the calendar entry
-- and search engines point there. The room or hall note ("Main hall, enter
-- by the side gate") already had a column, now set from the committee's
-- forms.
alter table public.events
  add column venue_name text
    check (char_length(trim(venue_name)) between 2 and 120),
  add column venue_postcode text
    check (char_length(venue_postcode) <= 10),
  add constraint events_venue_whole
    check ((venue_name is null) = (venue_postcode is null));

comment on column public.events.venue_name is
  'Where the event is held, when not at the mandir.';
comment on column public.events.venue_postcode is
  'The postcode of venue_name, for directions.';

-- Editing can now change the room and the venue too (see
-- 20261031100000_event_tickets.sql). Left as they were when not given.
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
begin
  select mandir_id into owner from public.events
    where id = target and status <> 'removed';
  if owner is null
    or not (public.is_toran_admin() or public.is_mandir_admin(owner)) then
    raise exception 'No such event' using errcode = 'P0002';
  end if;

  update public.events set
    title = details ->> 'title',
    summary = nullif(details ->> 'summary', ''),
    title_gu = nullif(details ->> 'title_gu', ''),
    summary_gu = nullif(details ->> 'summary_gu', ''),
    kind = coalesce(nullif(details ->> 'kind', ''), kind),
    starts_at = (details ->> 'starts_at')::timestamptz,
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
    -- A committee member editing it is confirming it; a Toran admin isn't.
    confirmed_at = case when public.is_mandir_admin(owner) then now() else confirmed_at end
  where id = target;

  delete from public.event_occurrences
    where event_id = target and starts_at >= today and starts_at <> all (dates);
  insert into public.event_occurrences (event_id, starts_at)
    select target, d from unnest(dates) as d where d >= today
    on conflict (event_id, starts_at) do nothing;
end;
$$;


revoke all on function public.edit_event(uuid, jsonb, timestamptz[], timestamptz) from public, anon;
grant execute on function public.edit_event(uuid, jsonb, timestamptz[], timestamptz) to authenticated;
