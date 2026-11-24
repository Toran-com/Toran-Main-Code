-- "Give to the mandir": the address of a mandir's own donation page (its
-- website's donate page, JustGiving, PayPal and so on), shown as a button
-- on its page. Toran only links to it: no payments go through Toran.
-- Committees and Toran edit it with the other practical details; the
-- existing policies already allow that. Secure web addresses only.
alter table public.mandirs
  add column donate_url text
    check (char_length(donate_url) <= 300 and donate_url ~* '^https://');

comment on column public.mandirs.donate_url is
  'The mandir''s own donation page, linked from its page as "Give to the mandir". No payments go through Toran.';
