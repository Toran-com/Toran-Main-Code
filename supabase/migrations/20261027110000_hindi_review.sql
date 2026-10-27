-- The review pack (/ops/translations) for Hindi as well as Gujarati: each
-- check is for one language, so the two reviewers' packs are separate.
-- Existing checks are all Gujarati.

alter table public.translation_checks rename column gujarati to translation;
alter table public.translation_checks
  add column locale text not null default 'gu' check (locale in ('gu', 'hi'));
alter table public.translation_checks alter column locale drop default;
alter table public.translation_checks drop constraint translation_checks_pkey;
alter table public.translation_checks add primary key (locale, key);

comment on table public.translation_checks is
  'Lines of the site''s wording whose Gujarati or Hindi has been checked, with the text as it was then.';
