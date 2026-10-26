-- "Getting there": a short note from the mandir for visitors (parking,
-- which entrance, the nearest station or bus), shown on its page and on
-- every event's page. Committees and Toran edit it with the other
-- practical details; the existing policies already allow that.
alter table public.mandirs
  add column getting_there text
    check (char_length(getting_there) <= 400);
