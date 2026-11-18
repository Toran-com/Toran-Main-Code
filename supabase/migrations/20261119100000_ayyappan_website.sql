-- London Sree Ayyappan Temple, Harrow: its own website, missed when the
-- starting details were gathered (its phone number came from this very
-- site; see supabase/data/mandir_details.csv). With it, Toran's website
-- scanner (/ops/websites) can read the temple's events. Only fills a
-- blank: a website its committee or a Toran admin has given since stays.

update public.mandirs
set website = 'https://www.londonayyappan.org'
where slug = 'london-sree-ayyappan-temple-harrow'
  and website is null;
