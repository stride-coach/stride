create table public.athlete_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  purpose text not null check (purpose in ('health_data')),
  policy_version text not null check (policy_version ~ '^\d{4}-\d{2}-\d{2}$'),
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  check (withdrawn_at is null or withdrawn_at >= granted_at)
);

create unique index athlete_consents_active_idx
  on public.athlete_consents (user_id, purpose)
  where withdrawn_at is null;

create index athlete_consents_history_idx
  on public.athlete_consents (user_id, purpose, granted_at desc);

create function public.stamp_consent_withdrawal()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.withdrawn_at := now();
  return new;
end;
$$;

revoke all on function public.stamp_consent_withdrawal() from public, anon, authenticated;

create trigger athlete_consents_withdrawal before update on public.athlete_consents
  for each row execute function public.stamp_consent_withdrawal();

alter table public.athlete_consents enable row level security;

create policy athlete_consents_owner_select on public.athlete_consents
  for select to authenticated using ((select auth.uid()) = user_id);
create policy athlete_consents_owner_insert on public.athlete_consents
  for insert to authenticated
  with check ((select auth.uid()) = user_id and withdrawn_at is null);
create policy athlete_consents_owner_withdraw on public.athlete_consents
  for update to authenticated
  using ((select auth.uid()) = user_id and withdrawn_at is null)
  with check ((select auth.uid()) = user_id);

revoke all on public.athlete_consents from anon, authenticated;
grant select on public.athlete_consents to authenticated;
grant insert (user_id, purpose, policy_version) on public.athlete_consents to authenticated;
grant update (withdrawn_at) on public.athlete_consents to authenticated;
