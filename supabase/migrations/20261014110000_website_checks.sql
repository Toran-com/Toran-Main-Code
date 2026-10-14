-- What happened the last time Toran read a mandir's website for events
-- (sources of kind 'crawler'): found some, found none, kept out by the
-- site's robots.txt, or couldn't reach it. Feeds the website report in
-- /ops and the H2 question in docs/launch-plan.md.

alter table public.sources
  add column last_outcome text
    check (last_outcome in ('found', 'none', 'blocked', 'unreachable')),
  add column last_found integer check (last_found >= 0);

comment on column public.sources.last_outcome is
  'For website checks: found, none, blocked (robots.txt) or unreachable.';
comment on column public.sources.last_found is
  'For website checks: how many upcoming events the last check could read.';
