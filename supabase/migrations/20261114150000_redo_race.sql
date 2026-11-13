create function public.redo_race(
  p_source uuid,
  p_name text,
  p_date date,
  p_priority text,
  p_course boolean,
  p_nutrition boolean,
  p_gear boolean,
  p_target integer default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_source public.athlete_races;
  v_race uuid;
  v_map jsonb := '{}'::jsonb;
  v_plan jsonb;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = 'PT401';
  end if;
  select * into v_source from public.athlete_races
  where id = p_source and user_id = v_user_id;
  if not found then
    raise exception 'not_found' using errcode = 'PT404';
  end if;
  if (select count(*) from public.athlete_races where user_id = v_user_id) >= 10 then
    raise exception 'race_limit' using errcode = 'PT409';
  end if;

  insert into public.athlete_races (
    user_id, name, race_date, priority, race_kind, distance_km, elevation_gain_m,
    location, poles, target_duration_seconds
  )
  values (
    v_user_id, btrim(p_name), p_date, p_priority, v_source.race_kind,
    v_source.distance_km, v_source.elevation_gain_m, v_source.location,
    v_source.poles, p_target
  )
  returning id into v_race;

  insert into public.race_plans (
    race_id, user_id, start_time, start_time_confirmed, cutoff_duration_seconds,
    labels, walk_grade_percent, walk_pace_seconds_per_km, aid_stop_seconds,
    water_stop_seconds, carbs_per_hour_g, water_ml_per_hour, sodium_mg_per_hour,
    nutrition_alarm_minutes, night_caffeine, flask_ml, flask_count, bladder_ml,
    caffeine_max_mg, roadbook_import
  )
  select
    v_race, v_user_id, start_time, false, cutoff_duration_seconds, labels,
    walk_grade_percent, walk_pace_seconds_per_km, aid_stop_seconds,
    water_stop_seconds, carbs_per_hour_g, water_ml_per_hour, sodium_mg_per_hour,
    nutrition_alarm_minutes, night_caffeine, flask_ml, flask_count, bladder_ml,
    caffeine_max_mg, case when p_course then roadbook_import end
  from public.race_plans
  where race_id = p_source and user_id = v_user_id;

  if p_course then
    insert into public.race_courses (
      race_id, user_id, source, file_name, source_activity_id, time_zone,
      distance_m, elevation_gain_m, elevation_loss_m, step_m, points
    )
    select
      v_race, v_user_id, source, file_name, source_activity_id, time_zone,
      distance_m, elevation_gain_m, elevation_loss_m, step_m, points
    from public.race_courses
    where race_id = p_source and user_id = v_user_id;

    select coalesce(jsonb_object_agg(id::text, gen_random_uuid()::text), '{}'::jsonb)
    into v_map
    from public.race_waypoints
    where race_id = p_source and user_id = v_user_id;

    insert into public.race_waypoints (
      id, race_id, user_id, kind, name, distance_m, cutoff_time, services,
      watch_label, alert_distance_m, voice_note, todo, nutrition_note, source,
      needs_review, stop_seconds, crew_access, crew_prepare, crew_reason
    )
    select
      (v_map ->> id::text)::uuid, v_race, v_user_id, kind, name, distance_m,
      cutoff_time, services, watch_label, alert_distance_m, voice_note, todo,
      nutrition_note, source, true, stop_seconds, crew_access, crew_prepare,
      crew_reason
    from public.race_waypoints
    where race_id = p_source and user_id = v_user_id;
  end if;

  if p_nutrition then
    select plan into v_plan from public.race_nutrition_plans
    where race_id = p_source and user_id = v_user_id;
    if v_plan is not null then
      insert into public.race_nutrition_plans (race_id, user_id, plan)
      values (
        v_race,
        v_user_id,
        jsonb_set(
          v_plan,
          '{segments}',
          coalesce(
            (
              select jsonb_object_agg(v_map ->> segment.key, segment.value)
              from jsonb_each(coalesce(v_plan -> 'segments', '{}'::jsonb)) as segment
              where v_map ? segment.key
            ),
            '{}'::jsonb
          )
        )
      );
    end if;
    insert into public.race_drop_bags (race_id, user_id, extras)
    select v_race, v_user_id, extras from public.race_drop_bags
    where race_id = p_source and user_id = v_user_id;
  end if;

  if p_gear then
    insert into public.race_checklist_items (
      race_id, user_id, list, label, detail, position, shoe_id
    )
    select v_race, v_user_id, list, label, detail, position, shoe_id
    from public.race_checklist_items
    where race_id = p_source and user_id = v_user_id and list like 'gear\_%';
  end if;

  return v_race;
end;
$$;

revoke all on function public.redo_race(uuid, text, date, text, boolean, boolean, boolean, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.redo_race(uuid, text, date, text, boolean, boolean, boolean, integer)
  to authenticated;
