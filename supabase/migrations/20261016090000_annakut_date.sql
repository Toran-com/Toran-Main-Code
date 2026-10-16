-- Annakut and the Gujarati New Year (Bestu Varas) 2026 falls on Tuesday
-- 10 November, not Monday 9 November as first seeded. Sources were split
-- between the two days; the Toran team settled on the 10th. It stays
-- "not yet checked" until someone ticks it off against a Gujarati panchang
-- in /ops/festivals.
update public.festival_dates fd
set starts_on = '2026-11-10',
    ends_on = '2026-11-10',
    source = 'Gujarati New Year 2026; date settled by the Toran team (some UK guides say 9 November); to check against a Gujarati panchang'
from public.festivals f
where f.id = fd.festival_id
  and f.slug = 'annakut'
  and fd.calendar = 'gujarati'
  and fd.starts_on = '2026-11-09'
  and not exists (
    select 1 from public.festival_dates other
    where other.festival_id = fd.festival_id
      and other.calendar = 'gujarati'
      and other.starts_on = '2026-11-10'
  );
