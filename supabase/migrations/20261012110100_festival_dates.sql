-- The main festivals and their 2026-27 dates in the UK. Every date is
-- provisional (verified = false) and says where it came from, until a Toran
-- admin checks it against a published panchang for London. Adds what is
-- missing and never overwrites later corrections.

insert into public.festivals (slug, name, summary) values
  ('navratri', 'Navratri', 'Nine nights of Garba and Raas, worshipping the Goddess in her nine forms.'),
  ('dussehra', 'Dussehra', 'Vijayadashami: the victory of good over evil, the day after Navratri ends.'),
  ('dhanteras', 'Dhanteras', 'The first day of Diwali, for Lakshmi puja and new beginnings.'),
  ('diwali', 'Diwali', 'The festival of lights.'),
  ('annakut', 'Annakut and New Year', 'The Gujarati New Year (Bestu Varas), with a mountain of food offered at the mandir.'),
  ('bhai-dooj', 'Bhai Dooj', 'Brothers and sisters, two days after Diwali.'),
  ('maha-shivaratri', 'Maha Shivaratri', 'The great night of Shiva, with all-night worship.'),
  ('holi', 'Holi', 'The festival of colours, after Holika Dahan the night before.')
on conflict (slug) do nothing;

insert into public.festival_dates (festival_id, calendar, starts_on, ends_on, source)
select f.id, d.calendar::public.calendar_tradition, d.starts_on::date, d.ends_on::date, d.source
from (values
  ('navratri', null, '2026-10-11', '2026-10-19',
    'Worked out for London sunrise in Toran''s research (audit/README.md); to check against a panchang'),
  ('dussehra', null, '2026-10-20', '2026-10-20',
    'Day after Navratri ends; to check against a panchang'),
  ('dhanteras', null, '2026-11-06', '2026-11-06',
    'UK festival guides; to check against a panchang'),
  ('diwali', null, '2026-11-08', '2026-11-08',
    'Toran''s research (audit/README.md) and UK festival guides; to check against a panchang'),
  ('annakut', 'gujarati', '2026-11-09', '2026-11-09',
    'UK date (India: 10 November) from UK festival guides; to check against a Gujarati panchang'),
  ('bhai-dooj', null, '2026-11-10', '2026-11-10',
    'hindutone.com UK guide; to check against a panchang'),
  ('maha-shivaratri', null, '2027-03-06', '2027-03-06',
    'Published festival lists; not yet checked for the UK'),
  ('holi', null, '2027-03-22', '2027-03-22',
    'Drik Panchang (not for a UK location); not yet checked for the UK'),
  ('navratri', null, '2027-09-30', '2027-10-08',
    'Drik Panchang (not for a UK location); not yet checked for the UK'),
  ('dussehra', null, '2027-10-09', '2027-10-09',
    'Drik Panchang (not for a UK location); not yet checked for the UK')
) as d (slug, calendar, starts_on, ends_on, source)
join public.festivals f on f.slug = d.slug
on conflict do nothing;
