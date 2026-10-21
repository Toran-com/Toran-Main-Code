-- Fixes from the pre-pilot security and privacy review
-- (docs/security-review.md).

-- 1. An email address counts only once it's proved. Invites are accepted
-- by email address, but the address in a login token isn't always proved:
-- if email confirmation is off in Supabase, anyone can sign up through the
-- API with a colleague's address and a password, and get a session at once
-- (Supabase then even marks the address confirmed). Toran only logs people
-- in by emailed link, so:
--   - a session that logged in with a password proves nothing, and
--   - the address is read from the account, once confirmed, not from the
--     token (which also stops a token from before an email change carrying
--     the old address).
create or replace function public.my_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select lower(u.email) from auth.users u
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
      and not coalesce((select auth.jwt()) -> 'amr', '[]'::jsonb)
        @> '[{"method": "password"}]'::jsonb
  ), '');
$$;

revoke all on function public.my_email() from public, anon;
grant execute on function public.my_email() to authenticated;

-- The same for asking to look after a mandir's page: Toran's admins see the
-- address on the request, so it must be one the person really has.
drop policy "Make a claim for yourself" on public.mandir_claims;
create policy "Make a claim for yourself"
  on public.mandir_claims for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.my_email() <> ''
    and status = 'pending'
    and decided_at is null
    and decided_by is null
  );

-- 2. A correction request's page is a path on this site. "//example.com"
-- or "/\example.com" would be a link to another site in /ops/attention.
create or replace function public.request_correction(kind text, page text, details text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(kind, '') not in ('wrong', 'remove_mandir', 'personal', 'other')
    or coalesce(page, '') !~ '^/\S{0,199}$'
    or page ~ '^/[/\\]'
    or position('\' in page) > 0
    or coalesce(length(trim(details)), 0) not between 2 and 1000 then
    raise exception 'That request isn''t complete' using errcode = '22023';
  end if;
  if (select count(*) from public.site_requests where done_at is null) >= 200 then
    raise exception 'Too many requests are waiting' using errcode = '54000';
  end if;
  insert into public.site_requests (kind, page, details)
    values (kind, page, trim(details));
end;
$$;

revoke all on function public.request_correction(text, text, text) from public;
grant execute on function public.request_correction(text, text, text) to anon, authenticated;

-- 3. Logins whose emailed link was never used had no time limit (decision
-- 0006: every table with personal data has one). Typing an address on the
-- login page creates an account for it; if nobody ever opens the link, the
-- address would otherwise stay for good. Deleted after 7 days.
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

  return jsonb_build_object(
    'invites', invites,
    'approved_claims', approved,
    'rejected_claims', rejected,
    'daily_counts', counts,
    'job_runs', runs,
    'site_requests', requests,
    'unused_logins', logins
  );
end;
$$;

revoke all on function public.run_retention() from public, anon, authenticated;
grant execute on function public.run_retention() to service_role;
