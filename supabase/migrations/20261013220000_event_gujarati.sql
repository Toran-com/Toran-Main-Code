-- An event's name and description in Gujarati, alongside the English, for
-- mandirs whose patrika is in both. Optional; shown under the English.

alter table public.events
  add column title_gu text
    check (title_gu is null or length(trim(title_gu)) between 2 and 120),
  add column summary_gu text check (length(summary_gu) <= 280);

comment on column public.events.title_gu is 'The event''s name in Gujarati, if the mandir gives one.';
comment on column public.events.summary_gu is 'The description in Gujarati, if the mandir gives one.';
