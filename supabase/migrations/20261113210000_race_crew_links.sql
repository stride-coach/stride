create table public.race_crew_links (
  race_id uuid primary key references public.athlete_races (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique check (token ~ '^[A-Za-z0-9_-]{32,64}$'),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index race_crew_links_user_id_idx on public.race_crew_links (user_id);

alter table public.race_crew_links enable row level security;

create policy race_crew_links_owner_select on public.race_crew_links
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy race_crew_links_owner_insert on public.race_crew_links
  for insert to authenticated
  with check ((select auth.uid()) = user_id and public.race_owned(race_id));
create policy race_crew_links_owner_update on public.race_crew_links
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and public.race_owned(race_id));
create policy race_crew_links_owner_delete on public.race_crew_links
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.race_crew_links from anon, authenticated;
grant select, delete on public.race_crew_links to authenticated;
grant insert (race_id, user_id, token, enabled) on public.race_crew_links to authenticated;
grant update (token, enabled, updated_at) on public.race_crew_links to authenticated;

create function public.crew_link_view(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'race', jsonb_build_object(
      'name', race.name,
      'race_date', race.race_date,
      'race_kind', race.race_kind,
      'distance_km', race.distance_km,
      'elevation_gain_m', race.elevation_gain_m,
      'target_duration_seconds', race.target_duration_seconds
    ),
    'plan', (
      select jsonb_build_object(
        'start_time', plan.start_time,
        'ambitious_duration_seconds', plan.ambitious_duration_seconds,
        'cautious_duration_seconds', plan.cautious_duration_seconds,
        'cutoff_duration_seconds', plan.cutoff_duration_seconds,
        'walk_grade_percent', plan.walk_grade_percent,
        'walk_pace_seconds_per_km', plan.walk_pace_seconds_per_km,
        'aid_stop_seconds', plan.aid_stop_seconds,
        'water_stop_seconds', plan.water_stop_seconds
      )
      from public.race_plans as plan
      where plan.race_id = race.id
    ),
    'course', (
      select jsonb_build_object(
        'time_zone', course.time_zone,
        'distance_m', course.distance_m,
        'elevation_gain_m', course.elevation_gain_m,
        'elevation_loss_m', course.elevation_loss_m,
        'step_m', course.step_m,
        'points', course.points
      )
      from public.race_courses as course
      where course.race_id = race.id
    ),
    'waypoints', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', point.id,
        'kind', point.kind,
        'name', point.name,
        'distance_m', point.distance_m,
        'cutoff_time', point.cutoff_time,
        'services', point.services,
        'stop_seconds', point.stop_seconds,
        'crew_access', point.crew_access,
        'crew_prepare', point.crew_prepare,
        'crew_reason', point.crew_reason
      ) order by point.distance_m)
      from public.race_waypoints as point
      where point.race_id = race.id
    ), '[]'::jsonb),
    'pace_factors', (
      select jsonb_object_agg(segment.key, segment.value -> 'paceFactor')
      from public.race_strategies as strategy,
        jsonb_each(strategy.segments) as segment
      where strategy.race_id = race.id
        and jsonb_typeof(segment.value -> 'paceFactor') = 'number'
    )
  )
  from public.race_crew_links as link
  join public.athlete_races as race on race.id = link.race_id
  left join public.race_courses as zone on zone.race_id = race.id
  where link.token = p_token
    and link.enabled
    and race.race_date is not null
    and (now() at time zone coalesce(zone.time_zone, 'Europe/Paris'))::date
      between race.race_date - 1 and race.race_date + 1;
$$;

revoke all on function public.crew_link_view(text) from public;
grant execute on function public.crew_link_view(text) to anon, authenticated;
