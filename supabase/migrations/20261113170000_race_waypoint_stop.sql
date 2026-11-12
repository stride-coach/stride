alter table public.race_waypoints
  add column stop_seconds integer
    check (stop_seconds is null or stop_seconds between 0 and 7200);

grant insert (stop_seconds) on public.race_waypoints to authenticated;
grant update (stop_seconds) on public.race_waypoints to authenticated;
