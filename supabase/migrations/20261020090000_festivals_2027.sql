-- More festivals, and dates through to Diwali 2027, so festival pages,
-- "Festivals coming up" and the seasonal pages cover the pilot launch in
-- spring 2027 and the year after. Every date is provisional
-- (verified = false) and says where it came from, until a Toran admin
-- checks it against a published panchang for London. Where published
-- calendars disagree by a day, the source says so. Adds what is missing
-- and never overwrites later corrections.

insert into public.festivals (slug, name, summary) values
  ('sharad-purnima', 'Sharad Purnima', 'The full moon after Navratri: Raas Garba under the moon, and doodh pauva.'),
  ('labh-pancham', 'Labh Pancham', 'The fifth day of the Gujarati New Year, for new beginnings in work and business.'),
  ('dev-diwali', 'Dev Diwali', 'Kartik Purnima, the full moon after Diwali, when lamps are lit for the gods.'),
  ('uttarayan', 'Uttarayan (Makar Sankranti)', 'The sun turns north: kites, til and gol, and khichdi.'),
  ('vasant-panchami', 'Vasant Panchami', 'The first day of spring, with Saraswati puja.'),
  ('holika-dahan', 'Holika Dahan', 'The bonfire on the night before Holi.'),
  ('ram-navami', 'Ram Navami', 'The birth of Shri Ram.'),
  ('hanuman-jayanti', 'Hanuman Jayanti', 'The birth of Hanumanji.'),
  ('guru-purnima', 'Guru Purnima', 'The full moon for honouring your guru.'),
  ('raksha-bandhan', 'Raksha Bandhan', 'Sisters tie a rakhi on their brothers'' wrists.'),
  ('janmashtami', 'Janmashtami', 'The birth of Shri Krishna, celebrated at midnight.'),
  ('ganesh-chaturthi', 'Ganesh Chaturthi', 'The birth of Ganeshji, with puja and visarjan.')
on conflict (slug) do nothing;

insert into public.festival_dates (festival_id, calendar, starts_on, ends_on, source)
select f.id, d.calendar::public.calendar_tradition, d.starts_on::date, d.ends_on::date, d.source
from (values
  ('sharad-purnima', null, '2026-10-25', '2026-10-25',
    'Night of the full moon by most published calendars (Drik Panchang lists 24 October); to check against a panchang for London'),
  ('labh-pancham', 'gujarati', '2026-11-14', '2026-11-14',
    'Several published calendars agree; to check against a Gujarati panchang'),
  ('dev-diwali', null, '2026-11-24', '2026-11-24',
    'Kartik Purnima in published festival lists; to check against a panchang for London'),
  ('uttarayan', null, '2027-01-14', '2027-01-14',
    'Most published calendars (some reckon it on 15 January); to check against a panchang for London'),
  ('vasant-panchami', null, '2027-02-11', '2027-02-11',
    'Published calendars agree; to check against a panchang for London'),
  ('holika-dahan', null, '2027-03-21', '2027-03-21',
    'Published calendars agree (the evening before Holi); to check against a panchang for London'),
  ('ram-navami', null, '2027-04-15', '2027-04-15',
    'Most published calendars (one lists 14 April); to check against a panchang for London'),
  ('hanuman-jayanti', null, '2027-04-20', '2027-04-20',
    'Chaitra Purnima, as North Indian and Gujarati calendars keep it (South Indian traditions differ); to check against a panchang'),
  ('guru-purnima', null, '2027-07-18', '2027-07-18',
    'Most published calendars; to check against a panchang for London'),
  ('raksha-bandhan', null, '2027-08-17', '2027-08-17',
    'Most published calendars (Drik Panchang lists 16 August); to check against a panchang for London'),
  ('janmashtami', null, '2027-08-25', '2027-08-25',
    'Vaishnava and ISKCON listings (Smarta listings give 24 August); to check with mandirs'),
  ('ganesh-chaturthi', null, '2027-09-03', '2027-09-03',
    'Drik Panchang and most published calendars (some list 4 September); to check against a panchang for London'),
  ('sharad-purnima', null, '2027-10-14', '2027-10-14',
    'Night of the full moon (some calendars list 15 October); to check against a panchang for London'),
  ('dhanteras', null, '2027-10-27', '2027-10-27',
    'Published calendars agree; to check against a panchang for London'),
  ('diwali', null, '2027-10-29', '2027-10-29',
    'Lakshmi puja in published calendars; to check against a panchang for London'),
  ('annakut', 'gujarati', '2027-10-30', '2027-10-30',
    'Most published calendars (Drik Panchang lists Govardhan Puja on 29 October); to check against a Gujarati panchang'),
  ('bhai-dooj', null, '2027-10-31', '2027-10-31',
    'Published calendars; to check against a panchang for London')
) as d (slug, calendar, starts_on, ends_on, source)
join public.festivals f on f.slug = d.slug
on conflict do nothing;
