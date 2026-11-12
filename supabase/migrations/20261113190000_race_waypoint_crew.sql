alter table public.race_waypoints
  add column crew_access text
    check (crew_access is null or char_length(btrim(crew_access)) between 1 and 120),
  add column crew_prepare text
    check (crew_prepare is null or char_length(btrim(crew_prepare)) between 1 and 200),
  add column crew_reason text
    check (crew_reason is null or char_length(btrim(crew_reason)) between 1 and 120);

grant insert (crew_access, crew_prepare, crew_reason) on public.race_waypoints to authenticated;
grant update (crew_access, crew_prepare, crew_reason) on public.race_waypoints to authenticated;
