-- Where each event came from, so pages can say so: added by the mandir's
-- committee, typed up from a forwarded poster, read from the mandir's
-- website, or sent in by a visitor. Older events are left unknown (null).
-- docs/core-functions.md asks for this label on every listing.

alter table public.events
  add column origin text check (origin in ('mandir', 'poster', 'website', 'visitor'));

comment on column public.events.origin is
  'Where the event came from: mandir, poster, website or visitor. Null for events added before this was recorded.';

-- Editing can now change an event's kind too (see 20261014100000_edit_event.sql).
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
