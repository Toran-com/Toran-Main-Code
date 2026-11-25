-- Requests to a mandir's committee (decision 0025): pujas, ceremonies and
-- hall hire. The committee lists what families can ask for; a family's
-- request (what, when, their name and how to reach them, a message) is
-- emailed to the committee and not kept by Toran.

alter table public.mandirs
  add column request_types text[] not null default '{}'
    check (cardinality(request_types) <= 8);

comment on column public.mandirs.request_types is
  'What families can ask the committee for through Toran (pujas, ceremonies, hall hire). Empty: no requests. Requests are emailed to the committee, not kept.';

-- Where a request goes: the committee members' login emails, for a mandir
-- with a committee that takes requests. For the site's own server code
-- only (service_role).
create or replace function public.request_recipients(target_slug text)
returns table (email text)
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text
  from public.mandirs m
  join public.mandir_admins a on a.mandir_id = m.id
  join auth.users u on u.id = a.user_id
  where m.slug = target_slug
    and m.status = 'claimed'
    and cardinality(m.request_types) > 0
    and u.email is not null
  order by a.added_at;
$$;

revoke all on function public.request_recipients(text) from public, anon, authenticated;
grant execute on function public.request_recipients(text) to service_role;
