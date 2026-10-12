-- Festivals and their dates, events at mandirs, and where each fact came
-- from (sources and claims). See docs/architecture.md sections 2 to 4.
-- Events are never deleted: they are marked removed, so any listing can be
-- explained later.

-- Festivals ---------------------------------------------------------------

create table public.festivals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) between 2 and 80),
  summary text check (length(summary) <= 280),
  created_at timestamptz not null default now()
);

comment on table public.festivals is 'Navratri, Diwali, Janmashtami and so on.';

-- The same festival can fall on different days for different calendar
-- traditions. Each mandir follows its own (mandirs.calendar).
create table public.festival_dates (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals (id) on delete cascade,
  calendar public.calendar_tradition,
  starts_on date not null,
  ends_on date not null,
  source text check (length(source) <= 300),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  check (ends_on - starts_on <= 14)
);

create unique index festival_dates_unique
  on public.festival_dates (festival_id, calendar, starts_on) nulls not distinct;
create index festival_dates_starts_idx on public.festival_dates (starts_on);

comment on column public.festival_dates.calendar is
  'Null when every tradition marks it on the same day.';
comment on column public.festival_dates.verified is
  'False until checked against a published panchang; shown as provisional.';

-- Sources: where information about a mandir's events comes from --------------

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  mandir_id uuid not null references public.mandirs (id) on delete cascade,
  kind text not null check (kind in ('website', 'forward', 'admin', 'facebook', 'public_report', 'crawler')),
  url text check (url is null or url ~ '^https?://'),
  label text check (length(label) <= 120),
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);

create index sources_mandir_idx on public.sources (mandir_id);

-- Events ------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  mandir_id uuid not null references public.mandirs (id) on delete restrict,
  title text not null check (length(trim(title)) between 2 and 120),
  kind text not null default 'other'
    check (kind in ('festival', 'aarti', 'bhajan', 'katha', 'class', 'seva', 'youth', 'community', 'other')),
  summary text check (length(summary) <= 280),
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  timezone text not null default 'Europe/London',
  recurrence text check (recurrence is null or recurrence ~ '^RRULE:'),
  location_note text check (length(location_note) <= 160),
  cost_note text check (length(cost_note) <= 80),
  link text check (link is null or link ~ '^https?://'),
  festival_date_id uuid references public.festival_dates (id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'cancelled', 'removed')),
  confirmed_at timestamptz,
  confirmed_by uuid references auth.users (id) on delete set null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create index events_mandir_idx on public.events (mandir_id, starts_at);
create index events_upcoming_idx on public.events (starts_at)
  where status in ('published', 'cancelled');

comment on column public.events.recurrence is
  'An iCalendar RRULE (e.g. RRULE:FREQ=WEEKLY;BYDAY=SA). Actual dates live in event_occurrences.';
comment on column public.events.confirmed_at is
  'When a mandir admin last confirmed this event. Shown as "Confirmed by the mandir, <date>".';

create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

-- Who confirmed is always the person doing it, never a name typed in.
create or replace function public.stamp_event_confirmation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.confirmed_at is not null then
      new.confirmed_by := (select auth.uid());
    end if;
  elsif new.confirmed_at is distinct from old.confirmed_at then
    new.confirmed_by := case when new.confirmed_at is null then null else (select auth.uid()) end;
  else
    new.confirmed_by := old.confirmed_by;
  end if;
  return new;
end;
$$;

create trigger events_stamp_confirmation before insert or update on public.events
  for each row execute function public.stamp_event_confirmation();

-- Each actual date of a repeating event (worked out by the app or a job).
create table public.event_occurrences (
  event_id uuid not null references public.events (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  cancelled boolean not null default false,
  primary key (event_id, starts_at),
  check (ends_at is null or ends_at >= starts_at)
);

create index event_occurrences_starts_idx on public.event_occurrences (starts_at);

-- Claims: one source saying something about an event --------------------------

create table public.event_claims (
  id uuid primary key default gen_random_uuid(),
  mandir_id uuid not null references public.mandirs (id) on delete cascade,
  event_id uuid references public.events (id) on delete set null,
  source_id uuid references public.sources (id) on delete set null,
  proposed jsonb not null check (jsonb_typeof(proposed) = 'object'),
  confidence numeric(3, 2) not null default 0.5 check (confidence between 0 and 1),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'superseded')),
  note text check (length(note) <= 500),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null
);

create index event_claims_review_idx on public.event_claims (created_at)
  where status = 'pending';
create index event_claims_mandir_idx on public.event_claims (mandir_id);

comment on table public.event_claims is
  'The review queue: what a forwarded poster, crawler run or public report says about an event, with confidence.';

-- Permissions ------------------------------------------------------------

alter table public.festivals enable row level security;
alter table public.festival_dates enable row level security;
alter table public.sources enable row level security;
alter table public.events enable row level security;
alter table public.event_occurrences enable row level security;
alter table public.event_claims enable row level security;

revoke all on public.festivals, public.festival_dates, public.sources,
  public.events, public.event_occurrences, public.event_claims
  from anon, authenticated;

grant select on public.festivals, public.festival_dates, public.events,
  public.event_occurrences to anon, authenticated;
grant insert, update on public.festivals, public.festival_dates to authenticated;
grant select, insert, update on public.sources to authenticated;
grant insert, update on public.events to authenticated;
grant insert, update, delete on public.event_occurrences to authenticated;
grant select, insert, update on public.event_claims to authenticated;

-- festivals and festival_dates: public; Toran admins maintain them.
create policy "Anyone can see festivals" on public.festivals
  for select to anon, authenticated using (true);
create policy "Toran admins add festivals" on public.festivals
  for insert to authenticated with check (public.is_toran_admin());
create policy "Toran admins edit festivals" on public.festivals
  for update to authenticated
  using (public.is_toran_admin()) with check (public.is_toran_admin());

create policy "Anyone can see festival dates" on public.festival_dates
  for select to anon, authenticated using (true);
create policy "Toran admins add festival dates" on public.festival_dates
  for insert to authenticated with check (public.is_toran_admin());
create policy "Toran admins edit festival dates" on public.festival_dates
  for update to authenticated
  using (public.is_toran_admin()) with check (public.is_toran_admin());

-- sources: the mandir's own admins and Toran admins.
create policy "Mandir admins and Toran admins see sources" on public.sources
  for select to authenticated
  using (public.is_toran_admin() or public.is_mandir_admin(mandir_id));
create policy "Mandir admins and Toran admins add sources" on public.sources
  for insert to authenticated
  with check (public.is_toran_admin() or public.is_mandir_admin(mandir_id));
create policy "Mandir admins and Toran admins edit sources" on public.sources
  for update to authenticated
  using (public.is_toran_admin() or public.is_mandir_admin(mandir_id))
  with check (public.is_toran_admin() or public.is_mandir_admin(mandir_id));

-- events: the public sees published and cancelled events at visible mandirs.
create policy "Visitors see published events" on public.events
  for select to anon
  using (
    status in ('published', 'cancelled')
    and exists (select 1 from public.mandirs m where m.id = mandir_id and m.status <> 'hidden')
  );
create policy "Signed-in people see published events, and drafts they run" on public.events
  for select to authenticated
  using (
    (status in ('published', 'cancelled')
      and exists (select 1 from public.mandirs m where m.id = mandir_id and m.status <> 'hidden'))
    or public.is_mandir_admin(mandir_id)
    or public.is_toran_admin()
  );
create policy "Mandir admins and Toran admins add events" on public.events
  for insert to authenticated
  with check (public.is_toran_admin() or public.is_mandir_admin(mandir_id));
create policy "Mandir admins and Toran admins edit events" on public.events
  for update to authenticated
  using (public.is_toran_admin() or public.is_mandir_admin(mandir_id))
  with check (public.is_toran_admin() or public.is_mandir_admin(mandir_id));

-- event_occurrences follow their event.
create policy "Anyone sees dates of events they can see" on public.event_occurrences
  for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_id));
create policy "Mandir admins and Toran admins add dates" on public.event_occurrences
  for insert to authenticated
  with check (exists (
    select 1 from public.events e where e.id = event_id
      and (public.is_toran_admin() or public.is_mandir_admin(e.mandir_id))));
create policy "Mandir admins and Toran admins edit dates" on public.event_occurrences
  for update to authenticated
  using (exists (
    select 1 from public.events e where e.id = event_id
      and (public.is_toran_admin() or public.is_mandir_admin(e.mandir_id))));
create policy "Mandir admins and Toran admins remove dates" on public.event_occurrences
  for delete to authenticated
  using (exists (
    select 1 from public.events e where e.id = event_id
      and (public.is_toran_admin() or public.is_mandir_admin(e.mandir_id))));

-- event_claims: the review queue, for the mandir's admins and Toran admins.
create policy "Mandir admins and Toran admins see claims" on public.event_claims
  for select to authenticated
  using (public.is_toran_admin() or public.is_mandir_admin(mandir_id));
create policy "Mandir admins and Toran admins add claims" on public.event_claims
  for insert to authenticated
  with check (public.is_toran_admin() or public.is_mandir_admin(mandir_id));
create policy "Mandir admins and Toran admins review claims" on public.event_claims
  for update to authenticated
  using (public.is_toran_admin() or public.is_mandir_admin(mandir_id))
  with check (public.is_toran_admin() or public.is_mandir_admin(mandir_id));
