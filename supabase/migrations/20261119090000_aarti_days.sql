-- An aarti can be on some days only: an evening aarti Monday to Saturday,
-- and at another time on Sundays. aarti_times entries may now say which
-- days, as [{"name": "Sandhya aarti", "time": "18:00", "days": [1, 2, 3, 4,
-- 5, 6]}] (1 is Monday … 7 is Sunday); without "days" it's every day, as
-- before. The days must be real, each once, and at least one.

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
        or (
          a ? 'days' and (
            jsonb_typeof(a -> 'days') <> 'array'
            or jsonb_array_length(a -> 'days') not between 1 and 7
            or exists (
              select 1 from jsonb_array_elements(a -> 'days') as d
              where jsonb_typeof(d) <> 'number'
                or d::text !~ '^[1-7]$'
            )
            or (select count(distinct d) from jsonb_array_elements(a -> 'days') as d)
              <> jsonb_array_length(a -> 'days')
          )
        )
    )
  );
$$;
