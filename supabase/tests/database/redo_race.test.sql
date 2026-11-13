begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, aud, role, email)
values
  ('a0000000-0000-4000-8000-0000000002e1', 'authenticated', 'authenticated', 'redo-a@example.com'),
  ('b0000000-0000-4000-8000-0000000002e2', 'authenticated', 'authenticated', 'redo-b@example.com');

insert into public.athlete_races (id, user_id, name, race_date, priority, race_kind, distance_km, elevation_gain_m, location)
values
  ('a0000000-0000-4000-8000-0000000002f1', 'a0000000-0000-4000-8000-0000000002e1', 'EcoTrail 2026', '2026-03-21', 'A', 'trail', 30, 600, 'Paris'),
  ('b0000000-0000-4000-8000-0000000002f2', 'b0000000-0000-4000-8000-0000000002e2', 'Maxicross', '2026-01-31', 'B', 'trail', 20, 400, null);

insert into public.race_plans (race_id, user_id, start_time, start_time_confirmed, walk_grade_percent, plan_b)
values ('a0000000-0000-4000-8000-0000000002f1', 'a0000000-0000-4000-8000-0000000002e1', '08:00', true, 12, 'cautious');

insert into public.race_courses (race_id, user_id, source, file_name, time_zone, distance_m, step_m, points)
values ('a0000000-0000-4000-8000-0000000002f1', 'a0000000-0000-4000-8000-0000000002e1', 'gpx', 'eco.gpx', 'Europe/Paris', 30000, 1000, '[[48.8, 2.3, 100], [48.9, 2.4, 120]]');

insert into public.race_waypoints (id, race_id, user_id, kind, name, distance_m, source)
values ('a0000000-0000-4000-8000-0000000002c1', 'a0000000-0000-4000-8000-0000000002f1', 'a0000000-0000-4000-8000-0000000002e1', 'aid', 'Buc', 10000, 'gpx');

insert into public.race_nutrition_plans (race_id, user_id, plan)
values (
  'a0000000-0000-4000-8000-0000000002f1',
  'a0000000-0000-4000-8000-0000000002e1',
  '{"products": {}, "segments": {"a0000000-0000-4000-8000-0000000002c1": {"items": [], "note": "Gel à Buc"}}}'
);

insert into public.race_checklist_items (race_id, user_id, list, label, status, checked)
values
  ('a0000000-0000-4000-8000-0000000002f1', 'a0000000-0000-4000-8000-0000000002e1', 'gear_kit', 'Veste', 'ready', true),
  ('a0000000-0000-4000-8000-0000000002f1', 'a0000000-0000-4000-8000-0000000002e1', 'prep_week', 'Dossard', null, true);

create function pg_temp.act_as(p_user uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.act_as('a0000000-0000-4000-8000-0000000002e1');

create temporary table redone as
select public.redo_race(
  'a0000000-0000-4000-8000-0000000002f1', 'EcoTrail 2027', '2027-03-20', 'A', true, true, true, 21600
) as id;

select results_eq(
  $$select name, race_date, race_kind, distance_km::numeric, location, target_duration_seconds
    from public.athlete_races where id = (select id from redone)$$,
  $$values ('EcoTrail 2027'::text, '2027-03-20'::date, 'trail'::text, 30::numeric, 'Paris'::text, 21600)$$,
  'the next edition keeps the race and takes the new date and target'
);
select results_eq(
  $$select walk_grade_percent, start_time_confirmed, plan_b
    from public.race_plans where race_id = (select id from redone)$$,
  $$values (12, false, null::text)$$,
  'the settings follow, the start is to confirm and the plan B is not carried'
);
select results_eq(
  $$select file_name from public.race_courses where race_id = (select id from redone)$$,
  $$values ('eco.gpx'::text)$$,
  'the course is copied'
);
select results_eq(
  $$select name, needs_review, id <> 'a0000000-0000-4000-8000-0000000002c1'
    from public.race_waypoints where race_id = (select id from redone)$$,
  $$values ('Buc'::text, true, true)$$,
  'waypoints are copied with new ids, to check'
);
select results_eq(
  $$select (plan -> 'segments' -> w.id::text ->> 'note')
    from public.race_nutrition_plans n
    join public.race_waypoints w on w.race_id = n.race_id
    where n.race_id = (select id from redone)$$,
  $$values ('Gel à Buc'::text)$$,
  'the fueling plan follows the new waypoint ids'
);
select results_eq(
  $$select list, label, status, checked from public.race_checklist_items
    where race_id = (select id from redone)$$,
  $$values ('gear_kit'::text, 'Veste'::text, null::text, false)$$,
  'only the gear lists are copied, unchecked'
);

create temporary table bare as
select public.redo_race(
  'a0000000-0000-4000-8000-0000000002f1', 'EcoTrail 2028', '2028-03-18', 'B', false, true, false
) as id;
select is_empty(
  $$select 1 from public.race_waypoints where race_id = (select id from bare)$$,
  'without the course nothing of the course is copied'
);
select results_eq(
  $$select plan -> 'segments' from public.race_nutrition_plans where race_id = (select id from bare)$$,
  $$values ('{}'::jsonb)$$,
  'without waypoints the fueling plan keeps no section'
);

select throws_ok(
  $$select public.redo_race('b0000000-0000-4000-8000-0000000002f2', 'Intrus', '2027-01-30', 'B', true, true, true)$$,
  'PT404', null, 'athlete cannot redo another athlete''s race'
);

reset role;
set local role anon;
select throws_ok(
  $$select public.redo_race('a0000000-0000-4000-8000-0000000002f1', 'Anon', '2027-01-30', 'B', true, true, true)$$,
  '42501', null, 'anon cannot redo a race'
);

select * from finish();
rollback;
