create table public.race_setting_changes (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.athlete_races (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  setting text not null check (setting in ('target', 'walk_grade', 'aid_stop')),
  previous_value integer check (previous_value between 0 and 1209599),
  value integer not null check (value between 0 and 1209599),
  created_at timestamptz not null default now()
);

create index race_setting_changes_race_idx
  on public.race_setting_changes (race_id, created_at desc);
create index race_setting_changes_user_id_idx
  on public.race_setting_changes (user_id);

alter table public.race_setting_changes enable row level security;

create policy race_setting_changes_owner_select on public.race_setting_changes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy race_setting_changes_owner_insert on public.race_setting_changes
  for insert to authenticated
  with check ((select auth.uid()) = user_id and public.race_owned(race_id));

revoke all on public.race_setting_changes from anon, authenticated;
grant select on public.race_setting_changes to authenticated;
grant insert (race_id, user_id, setting, previous_value, value)
  on public.race_setting_changes to authenticated;
