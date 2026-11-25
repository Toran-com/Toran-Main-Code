-- Forwarding posters and messages to Toran by email (decision 0031): a
-- committee member forwards a poster, a PDF patrika or a WhatsApp message
-- to their mandir's own Toran address, and the events wait for them in
-- "Posters waiting for you", as if they'd used the committee page.

-- Each email that came in, by Resend's id, so one delivered twice is read
-- once, and so a day's emails per mandir can be counted. Not who sent it,
-- what it said or what was attached: none of that is kept (decision 0006).
-- Cleared after 30 days.
create table public.inbound_emails (
  email_id text primary key check (length(email_id) between 1 and 100),
  mandir_id uuid references public.mandirs (id) on delete cascade,
  outcome text not null default 'reading' check (outcome in (
    'reading', 'read', 'nothing', 'failed', 'unknown', 'unverified',
    'choose', 'too-many', 'off')),
  events integer not null default 0 check (events >= 0),
  received_at timestamptz not null default now()
);

create index inbound_emails_mandir_day on public.inbound_emails (mandir_id, received_at);

comment on table public.inbound_emails is
  'Emails forwarded to Toran to be read for events: which mandir, how it went and how many events. Not the sender, the message or its attachments. Kept 30 days.';

alter table public.inbound_emails enable row level security;
revoke all on public.inbound_emails from anon, authenticated;
grant select on public.inbound_emails to authenticated;
grant select, insert, update, delete on public.inbound_emails to service_role;

create policy "Toran admins see how forwarded emails went"
  on public.inbound_emails for select to authenticated
  using (public.is_toran_admin());

-- Notes an email as come in, unless it already has, and clears the ones
-- over 30 days old. True if it's new.
create or replace function public.inbound_email_arrived(target text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  added integer;
begin
  delete from public.inbound_emails where received_at < now() - interval '30 days';
  insert into public.inbound_emails (email_id) values (target)
    on conflict (email_id) do nothing;
  get diagnostics added = row_count;
  return added = 1;
end;
$$;

revoke all on function public.inbound_email_arrived(text) from public, anon, authenticated;
grant execute on function public.inbound_email_arrived(text) to service_role;

-- The mandirs whose committee the sender of a forwarded email is on,
-- matched on the email address they log in with (confirmed), with how many
-- emails each has had read today. For the inbound email route only.
create or replace function public.inbound_sender_mandirs(sender text)
returns table (id uuid, slug text, name text, town text, today integer)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.slug, m.name, m.town,
    (select count(*)::int from public.inbound_emails i
      where i.mandir_id = m.id
        and i.received_at > now() - interval '1 day'
        and i.outcome in ('reading', 'read', 'nothing', 'failed'))
  from public.mandirs m
  where m.status = 'claimed'
    and exists (
      select 1
      from public.mandir_admins a
      join auth.users u on u.id = a.user_id
      where a.mandir_id = m.id
        and u.email_confirmed_at is not null
        and lower(u.email) = lower(trim(sender)))
  order by m.name;
$$;

revoke all on function public.inbound_sender_mandirs(text) from public, anon, authenticated;
grant execute on function public.inbound_sender_mandirs(text) to service_role;
