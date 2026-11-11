-- Family accounts (decision 0020): someone who logs in as a family can
-- keep the mandirs they follow and their plan on their account, so they
-- follow them to a new phone or a laptop. Built switched off: the site
-- only offers it when NEXT_PUBLIC_FAMILY_ACCOUNTS is "on", which waits for
-- Toran's ICO registration and the DPIA (decision 0006), because which
-- mandirs someone follows can reveal their religion.
--
-- What's kept is only what My Toran already keeps on the phone: mandir
-- addresses (slugs) and planned event ids with their dates. No names, no
-- postcodes, no history of what they did. Each person can see and change
-- only their own row, and can delete it (or their whole account) at any
-- time. Rows not touched for 2 years are deleted by the nightly clean-up.
create table public.family_saved (
  user_id uuid primary key default auth.uid()
    references auth.users (id) on delete cascade,
  following text[] not null default '{}'
    check (cardinality(following) <= 30),
  plan jsonb not null default '[]'::jsonb
    check (jsonb_typeof(plan) = 'array' and jsonb_array_length(plan) <= 30),
  updated_at timestamptz not null default now()
);

comment on table public.family_saved is
  'A family account''s followed mandirs and plan, kept so they appear on every device. Personal data: deleted with the account, or after 2 years unused.';

alter table public.family_saved enable row level security;

create policy "Families see their own saved lists"
  on public.family_saved for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Families save their own lists"
  on public.family_saved for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Families change their own lists"
  on public.family_saved for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Families delete their own lists"
  on public.family_saved for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.family_saved from anon;
grant select, insert, update, delete on public.family_saved to authenticated;

-- Closing a family account from /account: deletes the login itself, and
-- with it the saved lists. Not for anyone who runs a mandir or Toran:
-- their account is tied to a mandir's page, so they ask Toran instead.
create function public.delete_my_family_account()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    return false;
  end if;
  if exists (select 1 from public.mandir_admins a where a.user_id = me)
     or exists (select 1 from public.toran_admins t where t.user_id = me)
     or exists (select 1 from public.mandir_claims c
                where c.user_id = me and c.status = 'pending') then
    return false;
  end if;
  delete from auth.users where id = me;
  return true;
end;
$$;

comment on function public.delete_my_family_account() is
  'Deletes the logged-in family''s account and saved lists. Refuses (false) for anyone who runs or is asking to run a mandir, or runs Toran.';

revoke all on function public.delete_my_family_account() from public, anon;
grant execute on function public.delete_my_family_account() to authenticated;

-- The nightly clean-up also deletes saved lists not touched for 2 years.
create or replace function public.run_retention()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invites integer;
  approved integer;
  rejected integer;
  counts integer;
  runs integer;
  requests integer;
  logins integer;
  unconfirmed integer;
  saved integer;
begin
  -- Invites run out after 14 days.
  delete from public.mandir_invites where expires_at < now();
  get diagnostics invites = row_count;

  -- Requests to look after a page: approved ones 2 years after the
  -- decision, turned-down ones 6 months after.
  delete from public.mandir_claims
    where status = 'approved' and decided_at < now() - interval '2 years';
  get diagnostics approved = row_count;
  delete from public.mandir_claims
    where status = 'rejected' and decided_at < now() - interval '6 months';
  get diagnostics rejected = row_count;

  -- Visit totals after 3 years.
  delete from public.daily_counts
    where day < (now() at time zone 'Europe/London')::date - interval '3 years';
  get diagnostics counts = row_count;

  -- This job's own log after 90 days.
  delete from public.job_runs where ran_at < now() - interval '90 days';
  get diagnostics runs = row_count;

  -- Correction and removal requests 90 days after they were dealt with.
  delete from public.site_requests where done_at < now() - interval '90 days';
  get diagnostics requests = row_count;

  -- Logins never used, 7 days on. Never anyone who runs a mandir or Toran.
  delete from auth.users u
    where u.email_confirmed_at is null
      and u.created_at < now() - interval '7 days'
      and not exists (select 1 from public.mandir_admins a where a.user_id = u.id)
      and not exists (select 1 from public.toran_admins t where t.user_id = u.id);
  get diagnostics logins = row_count;

  -- Weekly email sign-ups never confirmed, 7 days on.
  delete from public.digest_subscribers
    where confirmed_at is null and created_at < now() - interval '7 days';
  get diagnostics unconfirmed = row_count;

  -- A family's saved lists, 2 years after they last changed.
  delete from public.family_saved where updated_at < now() - interval '2 years';
  get diagnostics saved = row_count;

  return jsonb_build_object(
    'invites', invites,
    'approved_claims', approved,
    'rejected_claims', rejected,
    'daily_counts', counts,
    'job_runs', runs,
    'site_requests', requests,
    'unused_logins', logins,
    'unconfirmed_digest', unconfirmed,
    'family_saved', saved
  );
end;
$$;
revoke all on function public.run_retention() from public, anon, authenticated;
grant execute on function public.run_retention() to service_role;
