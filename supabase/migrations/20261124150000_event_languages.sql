-- The language an event is in (Gujarati, Tamil, English...), so families
-- can find a katha or a class in their own language (decision 0027).
-- Up to four from a fixed list; none means not said. edit_event now
-- changes it too; a details object without "languages" leaves it as it was.

alter table public.events
  add column languages text[] not null default '{}'
    check (
      cardinality(languages) <= 4
      and languages <@ array['en', 'gu', 'hi', 'ta', 'pa', 'te', 'bn', 'mr', 'kn', 'ml', 'sa']
    );

comment on column public.events.languages is
  'The languages the event is held in (ISO 639-1 codes), as the committee says; empty when not said.';

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
  -- How long each date lasts, when the event has an end time.
  span interval := case
    when nullif(details ->> 'ends_at', '') is not null
    then (details ->> 'ends_at')::timestamptz - (details ->> 'starts_at')::timestamptz
  end;
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
    -- A committee member editing it is confirming it; a Toran admin isn't.
    confirmed_at = case when public.is_mandir_admin(owner) then now() else confirmed_at end
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
