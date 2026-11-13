begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

insert into auth.users (id, aud, role, email)
values
  ('a0000000-0000-4000-8000-0000000003e1', 'authenticated', 'authenticated', 'weather-a@example.com'),
  ('b0000000-0000-4000-8000-0000000003e2', 'authenticated', 'authenticated', 'weather-b@example.com');

insert into public.athlete_races (id, user_id, name, race_date, priority, race_kind)
values
  ('a0000000-0000-4000-8000-0000000003f1', 'a0000000-0000-4000-8000-0000000003e1', 'EcoTrail', '2027-03-20', 'A', 'trail'),
  ('b0000000-0000-4000-8000-0000000003f2', 'b0000000-0000-4000-8000-0000000003e2', 'Maxicross', '2027-01-31', 'B', 'trail');

insert into public.race_weather_snapshots (race_id, user_id, observed_on, weather)
values ('b0000000-0000-4000-8000-0000000003f2', 'b0000000-0000-4000-8000-0000000003e2', '2027-01-29', '{"mode": "forecast"}');

create function pg_temp.act_as(p_user uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select ok(rowsecurity, 'race_weather_snapshots has RLS enabled')
from pg_tables where schemaname = 'public' and tablename = 'race_weather_snapshots';

select pg_temp.act_as('a0000000-0000-4000-8000-0000000003e1');

select lives_ok(
  $$insert into public.race_weather_snapshots (race_id, user_id, observed_on, weather)
    values ('a0000000-0000-4000-8000-0000000003f1', 'a0000000-0000-4000-8000-0000000003e1', '2027-03-18', '{"mode": "forecast"}')$$,
  'athlete keeps the forecast of the day'
);
select throws_ok(
  $$insert into public.race_weather_snapshots (race_id, user_id, observed_on, weather)
    values ('a0000000-0000-4000-8000-0000000003f1', 'a0000000-0000-4000-8000-0000000003e1', '2027-03-18', '{"mode": "forecast"}')$$,
  '23505', null, 'one forecast per race and day'
);
select results_eq(
  $$select observed_on from public.race_weather_snapshots$$,
  $$values ('2027-03-18'::date)$$,
  'athlete reads only their own forecasts'
);
select throws_ok(
  $$insert into public.race_weather_snapshots (race_id, user_id, observed_on, weather)
    values ('b0000000-0000-4000-8000-0000000003f2', 'a0000000-0000-4000-8000-0000000003e1', '2027-01-30', '{}')$$,
  '42501', null, 'athlete cannot keep a forecast on another athlete''s race'
);
select results_eq(
  $$update public.race_weather_snapshots set adopted = true returning adopted$$,
  $$values (true)$$,
  'athlete adopts a forecast'
);
select throws_ok(
  $$update public.race_weather_snapshots set weather = '{}'$$,
  '42501', null, 'a kept forecast is not rewritten'
);

select * from finish();
rollback;
