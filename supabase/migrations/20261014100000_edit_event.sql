-- Changing an event's details. Runs as the person editing (so row-level
-- security still decides who may), and changes the event and its dates in
-- one go, so a repeating event is never left without its dates.
--
-- details: title, summary, title_gu, summary_gu, starts_at, all_day and
-- recurrence. dates: every start of a repeating event (empty for a one-off).
-- Dates before "today" are history and are left alone; later ones are
-- replaced, keeping any already marked cancelled that still apply.

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
    starts_at = (details ->> 'starts_at')::timestamptz,
    all_day = coalesce((details ->> 'all_day')::boolean, false),
    recurrence = nullif(details ->> 'recurrence', ''),
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
