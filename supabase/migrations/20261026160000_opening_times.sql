-- When a mandir is open for darshan, and its aarti times, shown on its
-- page with "Open now" or when it next opens. Committees and Toran edit
-- them with the other practical details; the existing policies already
-- allow that. Null means the mandir hasn't said.
--
-- opening_hours: up to two sessions a day, as
--   [{"day": 1-7 (Monday is 1), "opens": "07:30", "closes": "12:00"}, …]
-- aarti_times: up to six, as [{"name": "Mangla aarti", "time": "07:30"}, …]

create or replace function public.valid_opening_hours(hours jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select hours is null or (
    jsonb_typeof(hours) = 'array'
    and jsonb_array_length(hours) <= 14
    and not exists (
      select 1 from jsonb_array_elements(hours) as s
      where jsonb_typeof(s) <> 'object'
        or coalesce(s ->> 'day', '') !~ '^[1-7]$'
        or coalesce(s ->> 'opens', '') !~ '^([01]\d|2[0-3]):[0-5]\d$'
        or coalesce(s ->> 'closes', '') !~ '^([01]\d|2[0-3]):[0-5]\d$'
        or (s ->> 'closes') <= (s ->> 'opens')
    )
  );
$$;

create or replace function public.valid_aarti_times(aartis jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select aartis is null or (
    jsonb_typeof(aartis) = 'array'
    and jsonb_array_length(aartis) <= 6
    and not exists (
      select 1 from jsonb_array_elements(aartis) as a
      where jsonb_typeof(a) <> 'object'
        or jsonb_typeof(a -> 'name') <> 'string'
        or char_length(a ->> 'name') not between 1 and 40
        or coalesce(a ->> 'time', '') !~ '^([01]\d|2[0-3]):[0-5]\d$'
    )
  );
$$;

alter table public.mandirs
  add column opening_hours jsonb
    check (public.valid_opening_hours(opening_hours)),
  add column aarti_times jsonb
    check (public.valid_aarti_times(aarti_times));
