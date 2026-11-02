-- Explicit consent from committee members (DPIA section 5, action 2).
-- Being on a mandir's committee can reveal someone's religion, which is
-- special category data, so Toran relies on their explicit consent: a
-- separate, unticked box when they ask to look after a page or accept a
-- colleague's invite. When they gave it is stored with the request and
-- with their place on the committee. Withdrawing it is leaving the
-- committee (remove_committee_member) or asking Toran.

alter table public.mandir_claims add column consented_at timestamptz;
alter table public.mandir_admins add column consented_at timestamptz;

comment on column public.mandir_claims.consented_at is
  'When the person gave explicit consent to Toran recording that they help run this mandir.';
comment on column public.mandir_admins.consented_at is
  'When this committee member gave explicit consent. Null for members from before it was asked: they are asked on their committee page.';

-- Every new request needs it; earlier requests are left as they were.
alter table public.mandir_claims
  add constraint mandir_claims_consent check (consented_at is not null) not valid;

-- The time is the database's, whatever the request says.
create or replace function public.stamp_claim_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.consented_at is not null then
    new.consented_at := now();
  end if;
  return new;
end;
$$;

create trigger mandir_claims_consent_time
  before insert on public.mandir_claims
  for each row execute function public.stamp_claim_consent();

-- Approving a request carries its consent onto the committee.
create or replace function public.decide_mandir_claim(claim uuid, approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.mandir_claims;
begin
  if not public.is_toran_admin() then
    raise exception 'Only Toran admins can decide claims' using errcode = '42501';
  end if;

  select * into c from public.mandir_claims where id = claim for update;
  if not found then
    raise exception 'No such claim' using errcode = 'P0002';
  end if;
  if c.status <> 'pending' then
    raise exception 'This claim was already decided' using errcode = '22023';
  end if;

  update public.mandir_claims
    set status = case when approve then 'approved' else 'rejected' end,
        decided_at = now(),
        decided_by = (select auth.uid())
    where id = claim;

  if approve then
    insert into public.mandir_admins (mandir_id, user_id, added_by, consented_at)
      values (c.mandir_id, c.user_id, (select auth.uid()), c.consented_at)
      on conflict (mandir_id, user_id) do update
        set consented_at = coalesce(public.mandir_admins.consented_at, excluded.consented_at);
    update public.mandirs set status = 'claimed'
      where id = c.mandir_id and status = 'listed';
  end if;
end;
$$;

-- Accepting an invite now needs consent too.
drop function public.accept_committee_invite(uuid);

create function public.accept_committee_invite(invite uuid, consent boolean default false)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  i public.mandir_invites;
  target_slug text;
begin
  if consent is not true then
    raise exception 'consent_required' using errcode = '22023';
  end if;
  delete from public.mandir_invites where expires_at <= now();
  select * into i from public.mandir_invites
    where id = invite and email = public.my_email() and expires_at > now()
    for update;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  insert into public.mandir_admins (mandir_id, user_id, added_by, consented_at)
    values (i.mandir_id, (select auth.uid()), i.invited_by, now())
    on conflict (mandir_id, user_id) do update
      set consented_at = coalesce(public.mandir_admins.consented_at, now());
  update public.mandirs set status = 'claimed'
    where id = i.mandir_id and status = 'listed'
    returning slug into target_slug;
  delete from public.mandir_invites where id = invite;
  if target_slug is null then
    select slug into target_slug from public.mandirs where id = i.mandir_id;
  end if;
  return target_slug;
end;
$$;

revoke all on function public.accept_committee_invite(uuid, boolean) from public, anon;
grant execute on function public.accept_committee_invite(uuid, boolean) to authenticated;

-- Committee members from before consent was asked give it on their
-- committee page. Only for their own place, and only once.
create function public.give_committee_consent(target uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.mandir_admins
    set consented_at = now()
    where mandir_id = target
      and user_id = (select auth.uid())
      and consented_at is null;
  return found;
end;
$$;

revoke all on function public.give_committee_consent(uuid) from public, anon;
grant execute on function public.give_committee_consent(uuid) to authenticated;
