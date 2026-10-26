-- Spam guard for the public forms. Robots that get past the hidden field
-- and the per-sender limit (lib/spam.ts) are held to 30 sends an hour
-- across the whole site for each form, so a flood can't bury the review
-- queue in one go. Still nothing about senders is kept (decision 0006).
-- A correction that is the same as one already waiting isn't added again,
-- as reports of the same event already aren't.

-- 1. "Tell us about an event" -------------------------------------------------

create or replace function public.report_event(mandir_slug text, proposed jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
  source uuid;
  p jsonb := coalesce(proposed, '{}'::jsonb);
begin
  select id into target from public.mandirs
    where slug = mandir_slug and status <> 'hidden';
  if target is null then
    raise exception 'No such mandir' using errcode = 'P0002';
  end if;

  -- The same shape the app checks, checked again here because this can be
  -- called directly.
  if jsonb_typeof(p) <> 'object'
    or coalesce(length(trim(p ->> 'title')), 0) not between 2 and 120
    or coalesce(length(p ->> 'summary'), 0) > 280
    or coalesce(p ->> 'date', '') !~ '^\d{4}-\d{2}-\d{2}$'
    or coalesce(p ->> 'time', '') !~ '^(\d{2}:\d{2})?$'
    or coalesce(p ->> 'repeat', 'none') not in ('none', 'weekly', 'fortnightly', 'monthly', 'monthly-last')
    or coalesce(p ->> 'until', '') !~ '^(\d{4}-\d{2}-\d{2})?$'
    or coalesce(length(p ->> 'link'), 0) > 300
    or coalesce(p ->> 'link', '') !~ '^(https?://\S+)?$' then
    raise exception 'That report isn''t complete' using errcode = '22023';
  end if;

  -- Already listed, or already waiting to be checked: nothing to add. The
  -- visitor is thanked all the same.
  if exists (
      select 1 from public.events e
      where e.mandir_id = target and e.status <> 'removed'
        and public.london_day(e.starts_at) = (p ->> 'date')::date
        and public.event_title_key(e.title) = public.event_title_key(p ->> 'title'))
    or exists (
      select 1 from public.event_claims c
      where c.mandir_id = target and c.status in ('pending', 'accepted', 'rejected')
        and c.proposed ->> 'date' = p ->> 'date'
        and public.event_title_key(c.proposed ->> 'title') = public.event_title_key(p ->> 'title')) then
    return;
  end if;

  if (select count(*) from public.event_claims c
        join public.sources s on s.id = c.source_id
        where c.mandir_id = target and c.status = 'pending'
          and s.kind = 'public_report') >= 10
    or (select count(*) from public.event_claims c
        join public.sources s on s.id = c.source_id
        where c.status = 'pending' and s.kind = 'public_report') >= 300 then
    raise exception 'Too many reports are waiting to be checked'
      using errcode = '54000';
  end if;

  -- However many places they come from, no more than this in an hour.
  if (select count(*) from public.event_claims c
        join public.sources s on s.id = c.source_id
        where c.created_at > now() - interval '1 hour'
          and s.kind = 'public_report') >= 30 then
    raise exception 'Too many reports in the last hour'
      using errcode = '54000';
  end if;

  select id into source from public.sources
    where mandir_id = target and kind = 'public_report'
    order by created_at limit 1;
  if source is null then
    insert into public.sources (mandir_id, kind, label)
      values (target, 'public_report', 'Sent in by a visitor')
      returning id into source;
  end if;

  insert into public.event_claims (mandir_id, source_id, proposed, confidence)
    values (target, source, jsonb_build_object(
      'title', trim(p ->> 'title'),
      'date', p ->> 'date',
      'time', coalesce(p ->> 'time', ''),
      'summary', coalesce(p ->> 'summary', ''),
      'repeat', coalesce(p ->> 'repeat', 'none'),
      'until', coalesce(p ->> 'until', ''),
      'from', 'visitor',
      'link', coalesce(p ->> 'link', '')
    ), 0.4);
end;
$$;
revoke all on function public.report_event(text, jsonb) from public;
grant execute on function public.report_event(text, jsonb) to anon, authenticated;

-- 2. "Correct or remove something" -------------------------------------------

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
  -- The same request already waiting: nothing to add. Thanked all the same.
  if exists (
      select 1 from public.site_requests r
      where r.done_at is null and r.page = request_correction.page
        and lower(r.details) = lower(trim(request_correction.details))) then
    return;
  end if;
  if (select count(*) from public.site_requests where done_at is null) >= 200
    or (select count(*) from public.site_requests
        where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Too many requests are waiting' using errcode = '54000';
  end if;
  insert into public.site_requests (kind, page, details)
    values (kind, page, trim(details));
end;
$$;

revoke all on function public.request_correction(text, text, text) from public;
grant execute on function public.request_correction(text, text, text) to anon, authenticated;
