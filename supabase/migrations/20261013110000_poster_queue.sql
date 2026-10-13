-- The poster queue: Toran types up a forwarded poster as a pending
-- event_claim; the mandir's committee (or Toran, for a mandir nobody looks
-- after yet) publishes or discards it.
--
-- Who reviewed a poster, and when, is recorded by the database, never typed
-- in. Once reviewed, a poster's decision and details can't change.

create or replace function public.stamp_claim_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'pending' and (
    new.status is distinct from old.status
    or new.proposed is distinct from old.proposed
    or new.mandir_id is distinct from old.mandir_id
  ) then
    raise exception 'This poster has already been reviewed'
      using errcode = 'check_violation';
  end if;
  if old.status = 'pending' and new.status <> 'pending' then
    new.reviewed_at := now();
    new.reviewed_by := (select auth.uid());
  else
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
  end if;
  return new;
end;
$$;

create trigger event_claims_stamp_review before update on public.event_claims
  for each row execute function public.stamp_claim_review();

-- A new claim always starts pending and unreviewed.
create or replace function public.new_claim_is_pending()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.status := 'pending';
  new.reviewed_at := null;
  new.reviewed_by := null;
  return new;
end;
$$;

create trigger event_claims_new_pending before insert on public.event_claims
  for each row execute function public.new_claim_is_pending();
