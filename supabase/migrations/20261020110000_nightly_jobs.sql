-- The nightly job (/api/cron/nightly, decision 0016): deletes what the
-- retention policy (docs/legal/retention.md) says to delete, then checks
-- mandirs' websites. Each run leaves a line here, with totals only, so
-- /ops/attention can show the job is running.

create table public.job_runs (
  id bigint generated always as identity primary key,
  job text not null check (job in ('nightly')),
  ran_at timestamptz not null default now(),
  -- Totals only (how many deleted, how many websites checked): nothing
  -- about any person.
  summary jsonb not null default '{}'
);

comment on table public.job_runs is
  'When the nightly job ran and what it did, as totals. Kept 90 days.';

alter table public.job_runs enable row level security;
revoke all on public.job_runs from anon, authenticated;
grant select on public.job_runs to authenticated;

create policy "Toran admins see job runs" on public.job_runs
  for select to authenticated
  using (public.is_toran_admin());

-- Deletes what has passed its retention period, and says how many of
-- each. Only the nightly job calls it (as service_role).
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

  return jsonb_build_object(
    'invites', invites,
    'approved_claims', approved,
    'rejected_claims', rejected,
    'daily_counts', counts,
    'job_runs', runs
  );
end;
$$;

revoke all on function public.run_retention() from public, anon, authenticated;
grant execute on function public.run_retention() to service_role;
grant select, insert on public.job_runs to service_role;
