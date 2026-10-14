-- "Tell us about an event": anyone can send in an event for a listed
-- mandir, for the many mandirs whose news is only on WhatsApp or Facebook.
-- It joins the review queue like a forwarded poster, so nothing is
-- published until the committee (or Toran) checks it.
--
-- Nothing about the sender is kept (decision 0006): no name, email or IP
-- address. To stop flooding, each mandir can have at most 10 reports
-- waiting, and the whole site at most 300.

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
