-- The review pack (/ops/translations) for Tamil as well: a reviewer's
-- checks of the Tamil draft are kept like the Gujarati and Hindi ones.

alter table public.translation_checks
  drop constraint translation_checks_locale_check;
alter table public.translation_checks
  add constraint translation_checks_locale_check check (locale in ('gu', 'hi', 'ta'));

comment on table public.translation_checks is
  'Lines of the site''s wording whose Gujarati, Hindi or Tamil has been checked, with the text as it was then.';
