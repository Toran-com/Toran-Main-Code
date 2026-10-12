-- Toran admins: the people who run Toran (approve mandir claims, clear the
-- review queue). Added by hand in the Supabase SQL editor, never from the app:
--   insert into public.toran_admins (user_id, note)
--   select id, 'Milan' from auth.users where email = '...';

create table public.toran_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  added_at timestamptz not null default now()
);

comment on table public.toran_admins is
  'People who run Toran. Managed by hand; the app can only read its own row.';

alter table public.toran_admins enable row level security;

-- A signed-in person can see whether they themselves are an admin, nothing more.
create policy "Admins can see their own row"
  on public.toran_admins for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Supabase may grant new tables to the API roles by default; take that back
-- and give exactly what is needed.
revoke all on public.toran_admins from anon, authenticated;
grant select on public.toran_admins to authenticated;

-- True only for an admin who has passed the second factor in this session
-- (aal2). Admin-only rules elsewhere call this, so a stolen email link alone
-- never unlocks admin powers.
create or replace function public.is_toran_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
      select 1 from public.toran_admins where user_id = (select auth.uid())
    )
    and coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2';
$$;

comment on function public.is_toran_admin() is
  'True for a Toran admin signed in with a second factor (aal2).';

revoke all on function public.is_toran_admin() from public;
grant execute on function public.is_toran_admin() to authenticated;
