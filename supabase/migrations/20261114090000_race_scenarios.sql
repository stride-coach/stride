create table public.race_scenarios (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.athlete_races (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  target_seconds integer not null check (target_seconds between 60 and 1209599),
  walk_grade_percent integer check (walk_grade_percent between 5 and 20),
  aid_stop_seconds integer check (aid_stop_seconds between 0 and 3600),
  carbs_per_hour_g integer check (carbs_per_hour_g between 20 and 120),
  position integer not null default 0 check (position between 0 and 99),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index race_scenarios_race_idx on public.race_scenarios (race_id, position);
create index race_scenarios_user_id_idx on public.race_scenarios (user_id);

create trigger race_scenarios_revision before update on public.race_scenarios
  for each row execute function public.advance_revision();

alter table public.race_scenarios enable row level security;

create policy race_scenarios_owner_select on public.race_scenarios
  for select to authenticated using ((select auth.uid()) = user_id);
create policy race_scenarios_owner_insert on public.race_scenarios
  for insert to authenticated
  with check ((select auth.uid()) = user_id and public.race_owned(race_id));
create policy race_scenarios_owner_update on public.race_scenarios
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and public.race_owned(race_id));
create policy race_scenarios_owner_delete on public.race_scenarios
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.race_scenarios from anon, authenticated;
grant select, delete on public.race_scenarios to authenticated;
grant insert (
  race_id, user_id, name, target_seconds, walk_grade_percent, aid_stop_seconds,
  carbs_per_hour_g, position
) on public.race_scenarios to authenticated;
grant update (
  name, target_seconds, walk_grade_percent, aid_stop_seconds, carbs_per_hour_g, position
) on public.race_scenarios to authenticated;

alter table public.race_plans
  add column plan_b text check (
    plan_b is null
    or plan_b in ('cautious', 'ambitious')
    or plan_b ~ '^custom:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

grant update (plan_b) on public.race_plans to authenticated;
