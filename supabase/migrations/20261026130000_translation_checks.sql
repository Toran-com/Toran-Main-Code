-- The Gujarati review pack (/ops/translations): which lines of the site's
-- wording a Gujarati reviewer has checked, and what they said then, so
-- the next pack only needs the lines that are new or have changed since.
-- Only Toran admins read or write it.

create table public.translation_checks (
  key text primary key check (length(key) between 1 and 200),
  english text not null check (length(english) <= 4000),
  gujarati text not null check (length(gujarati) <= 4000),
  checked_at timestamptz not null default now()
);

comment on table public.translation_checks is
  'Lines of the site''s wording whose Gujarati has been checked, with the text as it was then.';

alter table public.translation_checks enable row level security;
revoke all on public.translation_checks from anon, authenticated;
grant select, insert, update on public.translation_checks to authenticated;

create policy "Toran admins see checks" on public.translation_checks
  for select to authenticated
  using (public.is_toran_admin());
create policy "Toran admins record checks" on public.translation_checks
  for insert to authenticated
  with check (public.is_toran_admin());
create policy "Toran admins update checks" on public.translation_checks
  for update to authenticated
  using (public.is_toran_admin())
  with check (public.is_toran_admin());
