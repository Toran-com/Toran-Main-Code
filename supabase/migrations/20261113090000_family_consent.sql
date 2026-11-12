-- Explicit consent for family accounts (DPIA section 5 and risk R13).
-- Which mandirs someone follows can show their religion (special category
-- data), so a family's lists are only kept on their account once they've
-- ticked a separate, unticked box on My Toran saying they agree. A row in
-- family_saved now means "this family agreed", and records when.
--
-- Family accounts have been switched off everywhere but the test build,
-- so the live database holds no saved lists. Any rows here came from
-- tests, without consent, so they go.
delete from public.family_saved;

alter table public.family_saved add column consented_at timestamptz not null;

comment on column public.family_saved.consented_at is
  'When the family gave explicit consent to Toran keeping these lists with their account. Set by the database; deleting the row withdraws it.';

-- The time is the database's, not whatever the browser sends, and it
-- can't be changed afterwards. Saving without saying yes leaves it empty,
-- which the column refuses.
create function public.stamp_family_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.consented_at is not null then
      new.consented_at := now();
    end if;
  else
    new.consented_at := old.consented_at;
  end if;
  return new;
end;
$$;

create trigger family_saved_consent_time
  before insert or update on public.family_saved
  for each row execute function public.stamp_family_consent();
