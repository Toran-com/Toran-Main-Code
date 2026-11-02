-- "Watch live": the address where a mandir streams its aarti and katha
-- (YouTube, Facebook or its own site), shown as a button on its page.
-- Committees and Toran edit it with the other practical details; the
-- existing policies already allow that. Web addresses only.
alter table public.mandirs
  add column live_url text
    check (char_length(live_url) <= 300 and live_url ~* '^https?://');
