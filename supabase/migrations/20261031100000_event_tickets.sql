-- Tickets and cost on events. A committee can say an event needs booking
-- first, and where to book. The cost ("Free", "£10 adults, children
-- free") already had a column, now set from the committee's forms.
alter table public.events
  add column tickets_needed boolean not null default false,
  add column tickets_url text
    check (char_length(tickets_url) <= 300 and tickets_url ~* '^https?://');

comment on column public.events.tickets_needed is
  'Whether people need to book or buy a ticket before they go.';
comment on column public.events.tickets_url is
  'Where to book or buy tickets, if online.';

-- Editing can now change the cost and tickets too (see
-- 20261014130000_event_origin.sql). Left as they were when not given.
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
