-- The weekly "What's on" email (lib/weekly-email.ts). Switched off until
-- Toran is registered with the ICO and has a DPIA (decision 0006): no
-- address can be saved until the site's DIGEST_SIGNUPS setting is "on".
--
-- What's kept is the least possible: an email address and, if chosen, a
-- region. No name, postcode or anything about the visitor. Sign-ups need
-- confirming from the email within 7 days, or they're deleted; leaving
-- deletes the row at once. Nobody can read the table, not even Toran's
-- admins: the weekly send uses the secret key.

create table public.digest_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null
    check (char_length(email) between 6 and 254
      and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  region text check (region is null or char_length(region) between 2 and 80),
  -- Only hashes of the links' secret codes; the codes themselves are in
  -- the emails.
  confirm_hash text not null check (confirm_hash ~ '^[0-9a-f]{64}$'),
  unsubscribe_hash text not null unique check (unsubscribe_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  last_sent_at timestamptz
);

create unique index digest_subscribers_email_idx
  on public.digest_subscribers (lower(email));

comment on table public.digest_subscribers is
  'People who asked for the weekly What''s on email: their address and region only. Read only with the secret key.';

alter table public.digest_subscribers enable row level security;
revoke all on public.digest_subscribers from anon, authenticated;

-- Signing up: the same answer whether or not the address was already
-- there, so nobody can find out who's subscribed. Someone else typing in
-- a confirmed address can't change what it gets: only a new confirmation
-- link is made, which goes to that inbox.
create or replace function public.subscribe_digest(
  address text,
  area text,
  confirm text,
  leave text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.digest_subscribers
        where created_at > now() - interval '1 hour') >= 200 then
    raise exception 'busy' using errcode = '54000';
  end if;
  insert into public.digest_subscribers (email, region, confirm_hash, unsubscribe_hash)
    values (lower(trim(address)), nullif(trim(area), ''), confirm, leave)
  on conflict (lower(email)) do update
    set region = case when public.digest_subscribers.confirmed_at is null
                      then excluded.region
                      else public.digest_subscribers.region end,
        confirm_hash = excluded.confirm_hash;
end;
$$;

-- The link in the confirmation email. True if it was a real, recent one.
create or replace function public.confirm_digest(code_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.digest_subscribers
    set confirmed_at = coalesce(confirmed_at, now())
    where confirm_hash = code_hash
      and (confirmed_at is not null or created_at > now() - interval '7 days');
  return found;
end;
$$;

-- "Unsubscribe" in any email: the row goes at once.
create or replace function public.unsubscribe_digest(code_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.digest_subscribers where unsubscribe_hash = code_hash;
  return found;
end;
$$;

revoke all on function public.subscribe_digest(text, text, text, text) from public;
revoke all on function public.confirm_digest(text) from public;
revoke all on function public.unsubscribe_digest(text) from public;
grant execute on function public.subscribe_digest(text, text, text, text) to anon, authenticated;
grant execute on function public.confirm_digest(text) to anon, authenticated;
grant execute on function public.unsubscribe_digest(text) to anon, authenticated;

-- The nightly clean-up also deletes sign-ups never confirmed, 7 days on.
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

  return jsonb_build_object(
    'invites', invites,
    'approved_claims', approved,
    'rejected_claims', rejected,
    'daily_counts', counts,
    'job_runs', runs,
    'site_requests', requests,
    'unused_logins', logins,
    'unconfirmed_digest', unconfirmed
  );
end;
$$;
revoke all on function public.run_retention() from public, anon, authenticated;
grant execute on function public.run_retention() to service_role;

-- The weekly send records its totals in the job log too.
alter table public.job_runs drop constraint job_runs_job_check;
alter table public.job_runs
  add constraint job_runs_job_check check (job in ('nightly', 'weekly'));
