-- A mandir's aarti times, as events in What's on: when a committee (or
-- Toran) saves the mandir's daily aarti times, each becomes an event that
-- happens every day for a year (lib/aarti-events.ts), so it shows in
-- What's on and near me like any other. They're marked with their own
-- origin, so they can be kept in step when the times change, and left out
-- of the weekly messages and "Still on?" reminders.

alter table public.events drop constraint if exists events_origin_check;
alter table public.events
  add constraint events_origin_check
  check (origin in ('mandir', 'poster', 'website', 'visitor', 'aarti'));

comment on column public.events.origin is
  'Where the event came from: mandir, poster, website, visitor, or aarti (made from the mandir''s daily aarti times). Null for events added before this was recorded.';
