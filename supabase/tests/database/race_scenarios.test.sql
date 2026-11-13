begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

insert into auth.users (id, aud, role, email)
values
  ('a0000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'scenario-a@example.com'),
  ('b0000000-0000-4000-8000-0000000000e2', 'authenticated', 'authenticated', 'scenario-b@example.com');

insert into public.athlete_races (id, user_id, name, race_date, priority, race_kind)
values
  ('a0000000-0000-4000-8000-0000000000f1', 'a0000000-0000-4000-8000-0000000000e1', 'EcoTrail', '2027-03-20', 'A', 'trail'),
  ('b0000000-0000-4000-8000-0000000000f2', 'b0000000-0000-4000-8000-0000000000e2', 'Maxicross', '2027-01-31', 'B', 'trail');

insert into public.race_plans (race_id, user_id)
values
  ('a0000000-0000-4000-8000-0000000000f1', 'a0000000-0000-4000-8000-0000000000e1'),
  ('b0000000-0000-4000-8000-0000000000f2', 'b0000000-0000-4000-8000-0000000000e2');

insert into public.race_scenarios (race_id, user_id, name, target_seconds)
values ('b0000000-0000-4000-8000-0000000000f2', 'b0000000-0000-4000-8000-0000000000e2', 'Le mien', 18000);

create function pg_temp.act_as(p_user uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select ok(rowsecurity, 'race_scenarios has RLS enabled')
from pg_tables where schemaname = 'public' and tablename = 'race_scenarios';

set local role anon;
select throws_ok('select * from public.race_scenarios', '42501', null, 'anon cannot read scenarios');
reset role;

select pg_temp.act_as('a0000000-0000-4000-8000-0000000000e1');

select lives_ok(
  $$insert into public.race_scenarios (race_id, user_id, name, target_seconds, walk_grade_percent, carbs_per_hour_g)
    values ('a0000000-0000-4000-8000-0000000000f1', 'a0000000-0000-4000-8000-0000000000e1', 'Prudent de nuit', 66600, 8, 60)$$,
  'athlete creates a scenario on their race'
);
select results_eq(
  $$select name, target_seconds from public.race_scenarios$$,
  $$values ('Prudent de nuit'::text, 66600)$$,
  'athlete reads only their own scenarios'
);
select throws_ok(
  $$insert into public.race_scenarios (race_id, user_id, name, target_seconds)
    values ('b0000000-0000-4000-8000-0000000000f2', 'a0000000-0000-4000-8000-0000000000e1', 'Intrus', 18000)$$,
  '42501', null, 'athlete cannot add a scenario to another athlete''s race'
);
select throws_ok(
  $$insert into public.race_scenarios (race_id, user_id, name, target_seconds)
    values ('a0000000-0000-4000-8000-0000000000f1', 'a0000000-0000-4000-8000-0000000000e1', '   ', 18000)$$,
  '23514', null, 'a scenario needs a name'
);
select throws_ok(
  $$insert into public.race_scenarios (race_id, user_id, name, target_seconds, carbs_per_hour_g)
    values ('a0000000-0000-4000-8000-0000000000f1', 'a0000000-0000-4000-8000-0000000000e1', 'Trop', 18000, 200)$$,
  '23514', null, 'carbs per hour stay within the plan range'
);
select results_eq(
  $$update public.race_scenarios set target_seconds = 64800 returning revision$$,
  $$values (2)$$,
  'an update advances the revision'
);
select lives_ok(
  $$update public.race_plans set plan_b = 'cautious'
    where race_id = 'a0000000-0000-4000-8000-0000000000f1'$$,
  'athlete keeps the prudent scenario as plan B'
);
select throws_ok(
  $$update public.race_plans set plan_b = 'whatever'
    where race_id = 'a0000000-0000-4000-8000-0000000000f1'$$,
  '23514', null, 'plan B names a built-in or custom scenario'
);
select is_empty(
  $$delete from public.race_scenarios
    where user_id = 'b0000000-0000-4000-8000-0000000000e2' returning id$$,
  'athlete cannot delete another athlete''s scenario'
);

select * from finish();
rollback;
