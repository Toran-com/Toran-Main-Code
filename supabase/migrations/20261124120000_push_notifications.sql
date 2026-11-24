-- Phone notifications for followed mandirs (decision 0024). A family who
-- turns them on gives Toran their browser's push address (a long random
-- web address from Apple, Google or Mozilla, with two keys to encrypt to
-- it) and the mandirs they follow, nothing else: no name, email or
-- account. Toran sends a notice from a followed mandir's committee at
-- once, and once a day new events at followed mandirs. Turning them off
-- deletes it; so does the browser saying the address is gone, and a year
-- without use.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique
    check (length(endpoint) <= 1000 and endpoint ~ '^https://'),
  p256dh text not null check (length(p256dh) between 20 and 200),
  auth text not null check (length(auth) between 10 and 100),
  mandirs text[] not null default '{}'
    check (cardinality(mandirs) <= 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- New events after this go in the next daily notification.
  last_digest_at timestamptz not null default now()
);

create index push_subscriptions_mandirs_idx on public.push_subscriptions using gin (mandirs);

comment on table public.push_subscriptions is
  'Browsers that asked for notifications from the mandirs they follow: the push address and keys, and the mandirs. No name, email or account. Deleted when turned off, when the address is gone, or after a year unused.';

-- Only the site's own server code (service_role) reads or sends; visitors
-- save and remove their own through the functions below, by the address
-- only their browser knows.
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, update, delete on public.push_subscriptions to service_role;

-- Turn on, or change which mandirs: only real, visible mandirs are kept.
create or replace function public.save_push_subscription(
  target_endpoint text, key_p256dh text, key_auth text, slugs text[]
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  kept text[];
begin
  select coalesce(array_agg(m.slug order by m.slug), '{}') into kept
    from public.mandirs m
    where m.slug = any (slugs[1:30]) and m.status <> 'hidden';
  insert into public.push_subscriptions as p (endpoint, p256dh, auth, mandirs)
    values (target_endpoint, key_p256dh, key_auth, kept)
    on conflict (endpoint) do update
      set p256dh = excluded.p256dh, auth = excluded.auth,
          mandirs = excluded.mandirs, updated_at = now();
  return true;
end;
$$;

-- Turn off: deleted at once.
create or replace function public.drop_push_subscription(target_endpoint text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.push_subscriptions where endpoint = target_endpoint;
$$;

revoke all on function public.save_push_subscription(text, text, text, text[]) from public;
revoke all on function public.drop_push_subscription(text) from public;
grant execute on function public.save_push_subscription(text, text, text, text[]) to anon, authenticated;
grant execute on function public.drop_push_subscription(text) to anon, authenticated;

-- The daily notifications' runs are kept with the other jobs' (the
-- committee email's too, whichever change comes first).
alter table public.job_runs drop constraint job_runs_job_check;
alter table public.job_runs
  add constraint job_runs_job_check check (job in ('nightly', 'weekly', 'committee-email', 'push'));
