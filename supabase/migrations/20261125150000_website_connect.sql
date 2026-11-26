-- "Connect your website" (decision 0032): a committee presses one button
-- and Toran keeps its page in step with the mandir's own website every
-- night. Events the website publishes as data (a calendar, an events
-- plugin, event markup) can go live straight away if the committee says
-- so; posters and patrikas on the site are read with AI and always wait
-- for the committee to check.

create table public.website_connections (
  mandir_id uuid primary key references public.mandirs (id) on delete cascade,
  website text not null check (website ~ '^https?://' and length(website) <= 500),
  -- Publish events the website lists as data without a check.
  auto_publish boolean not null default true,
  -- Read the website's posters and patrikas with AI (always checked).
  read_posters boolean not null default true,
  connected_by uuid references auth.users (id) on delete set null,
  connected_at timestamptz not null default now(),
  last_checked_at timestamptz,
  -- found, none, blocked or unreachable (lib/website-check.ts).
  last_outcome text check (last_outcome in ('found', 'none', 'blocked', 'unreachable')),
  last_found integer check (last_found >= 0),
  last_published integer check (last_published >= 0),
  last_queued integer check (last_queued >= 0),
  last_posters integer check (last_posters >= 0),
  -- When the committee asked Toran to help connect it.
  help_asked_at timestamptz
);

comment on table public.website_connections is
  'Mandirs whose committee connected their own website to Toran (decision 0032): how and when it was last read. No personal data beyond who connected it.';

alter table public.website_connections enable row level security;
revoke all on public.website_connections from anon, authenticated;
grant select, insert, update, delete on public.website_connections to authenticated;
grant select, insert, update, delete on public.website_connections to service_role;

create policy "Committees see their website connection"
  on public.website_connections for select to authenticated
  using (public.is_mandir_admin(mandir_id) or public.is_toran_admin());

create policy "Committees connect their website"
  on public.website_connections for insert to authenticated
  with check (public.is_mandir_admin(mandir_id) and connected_by = (select auth.uid()));

create policy "Committees change their website connection"
  on public.website_connections for update to authenticated
  using (public.is_mandir_admin(mandir_id))
  with check (public.is_mandir_admin(mandir_id));

create policy "Committees disconnect their website"
  on public.website_connections for delete to authenticated
  using (public.is_mandir_admin(mandir_id));

-- The posters and patrikas already read from each website, so each is read
-- (and paid for) once. Just their addresses; forgotten after a year.
create table public.website_reads (
  mandir_id uuid not null references public.mandirs (id) on delete cascade,
  url text not null check (length(url) <= 1000),
  events integer not null default 0 check (events >= 0),
  read_at timestamptz not null default now(),
  primary key (mandir_id, url)
);

comment on table public.website_reads is
  'Posters and patrikas on mandirs'' websites already read with AI (decision 0032): their addresses only. Kept a year.';

alter table public.website_reads enable row level security;
revoke all on public.website_reads from anon, authenticated;
grant select, insert, update, delete on public.website_reads to service_role;

-- The connected websites to read tonight, longest ago first, with their
-- mandirs. For the website job only (service_role).
create or replace function public.website_connections_due(max_sites integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(row_to_json(c)::jsonb order by c.last_checked_at nulls first), '[]'::jsonb)
  from (
    select w.mandir_id, w.website, w.auto_publish, w.read_posters, w.last_checked_at,
      m.slug, m.name, m.town
    from public.website_connections w
    join public.mandirs m on m.id = w.mandir_id
    where m.status = 'claimed'
    order by w.last_checked_at nulls first
    limit max_sites
  ) c;
$$;

revoke all on function public.website_connections_due(integer) from public, anon, authenticated;
grant execute on function public.website_connections_due(integer) to service_role;

-- The website job's runs are kept with the other jobs'; old reads go.
alter table public.job_runs drop constraint job_runs_job_check;
alter table public.job_runs
  add constraint job_runs_job_check
  check (job in ('nightly', 'weekly', 'committee-email', 'push', 'seva-roundup',
    'committee-digest', 'websites'));
