create table public.race_checkins (
  race_id uuid not null references public.athlete_races (id) on delete cascade,
  waypoint_id uuid not null references public.race_waypoints (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  checked_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (race_id, waypoint_id)
);

create index race_checkins_user_id_idx on public.race_checkins (user_id);
create index race_checkins_waypoint_id_idx on public.race_checkins (waypoint_id);

alter table public.race_checkins enable row level security;

create policy race_checkins_owner_select on public.race_checkins
  for select to authenticated using ((select auth.uid()) = user_id);
create policy race_checkins_owner_insert on public.race_checkins
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and public.race_owned(race_id)
    and exists (
      select 1 from public.race_waypoints waypoint
      where waypoint.id = waypoint_id and waypoint.race_id = race_checkins.race_id
    )
  );
create policy race_checkins_owner_update on public.race_checkins
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy race_checkins_owner_delete on public.race_checkins
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.race_checkins from anon, authenticated;
grant select, delete on public.race_checkins to authenticated;
grant insert (race_id, waypoint_id, user_id, checked_at) on public.race_checkins to authenticated;
grant update (checked_at, updated_at) on public.race_checkins to authenticated;
