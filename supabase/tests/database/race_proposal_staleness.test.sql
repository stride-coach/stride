begin;

create extension if not exists pgtap with schema extensions;
select plan(32);

insert into auth.users (id, aud, role, email) values
  ('a7000000-0000-4000-8000-00000000000a', 'authenticated', 'authenticated', 'race-stale-a@example.com'),
  ('b7000000-0000-4000-8000-00000000000b', 'authenticated', 'authenticated', 'race-stale-b@example.com');

insert into public.athlete_races (id, user_id, name, race_kind, priority) values
  ('a7000000-0000-4000-8000-0000000000c1', 'a7000000-0000-4000-8000-00000000000a',
   'EcoTrail Paris', 'trail', 'A'),
  ('b7000000-0000-4000-8000-0000000000c2', 'b7000000-0000-4000-8000-00000000000b',
   'Trail B', 'trail', 'A');

insert into public.race_waypoints (id, race_id, user_id, kind, name, distance_m) values
  ('a7000000-0000-4000-8000-0000000000f1', 'a7000000-0000-4000-8000-0000000000c1',
   'a7000000-0000-4000-8000-00000000000a', 'aid', 'Ravito', 10000),
  ('a7000000-0000-4000-8000-0000000000f2', 'a7000000-0000-4000-8000-0000000000c1',
   'a7000000-0000-4000-8000-00000000000a', 'finish', 'Arrivée', 20000);

insert into public.race_plans (race_id, user_id) values
  ('a7000000-0000-4000-8000-0000000000c1', 'a7000000-0000-4000-8000-00000000000a');

insert into public.coach_sessions (id, user_id, managed_session_id, mode, budget_cents) values
  ('b7000000-0000-4000-8000-0000000000d1', 'b7000000-0000-4000-8000-00000000000b',
   'sesn_01StaleB', 'conversation', 100);

insert into public.race_proposals (id, user_id, race_id, kind, title, payload) values
  ('a7000000-0000-4000-8000-0000000000e1', 'a7000000-0000-4000-8000-00000000000a',
   'a7000000-0000-4000-8000-0000000000c1', 'strategy', 'Proposition de A',
   '{"consignes": ["Pars lentement."], "segments": {}}');

create function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

set local role anon;
select throws_ok(
  $$select public.submit_race_proposal('a7000000-0000-4000-8000-0000000000c1', 'strategy',
    'Anonyme', '{"consignes": [], "segments": {}}')$$,
  '42501', null, 'anonymous user cannot submit a proposal');
select throws_ok(
  $$select public.accept_race_proposal('a7000000-0000-4000-8000-0000000000e1')$$,
  '42501', null, 'anonymous user cannot accept a proposal');
select throws_ok(
  $$select public.reject_race_proposal('a7000000-0000-4000-8000-0000000000e1')$$,
  '42501', null, 'anonymous user cannot refuse a proposal');
reset role;

select pg_temp.act_as('b7000000-0000-4000-8000-00000000000b');
select throws_ok(
  $$select public.accept_race_proposal('a7000000-0000-4000-8000-0000000000e1')$$,
  'PT404', null, 'another athlete cannot accept a proposal by its id');
select throws_ok(
  $$select public.reject_race_proposal('a7000000-0000-4000-8000-0000000000e1')$$,
  'PT404', null, 'another athlete cannot refuse a proposal by its id');
select throws_ok(
  $$insert into public.race_nutrition_plans (race_id, user_id, plan)
    values ('a7000000-0000-4000-8000-0000000000c1', 'b7000000-0000-4000-8000-00000000000b', '{}')$$,
  '42501', null, 'another athlete cannot write a nutrition plan on A''s race');
select throws_ok(
  $$insert into public.race_drop_bags (race_id, user_id, extras)
    values ('a7000000-0000-4000-8000-0000000000c1', 'b7000000-0000-4000-8000-00000000000b', '{Veste}')$$,
  '42501', null, 'another athlete cannot write a drop bag on A''s race');
reset role;

select pg_temp.act_as('a7000000-0000-4000-8000-00000000000a');
select throws_ok(
  $$select public.submit_race_proposal('a7000000-0000-4000-8000-0000000000c1', 'strategy',
    'Session volée', '{"consignes": [], "segments": {}}', null,
    'b7000000-0000-4000-8000-0000000000d1')$$,
  'PT400', null, 'a proposal cannot point to another athlete''s coach session');

select lives_ok(
  $$insert into public.race_drop_bags (race_id, user_id, extras)
    values ('a7000000-0000-4000-8000-0000000000c1', 'a7000000-0000-4000-8000-00000000000a',
      '{"Veste chaude","Chaussettes"}')$$,
  'athlete stores drop bag extras');
select throws_ok(
  $$update public.race_drop_bags set extras = array[repeat('x', 81)]$$,
  '23514', null, 'a drop bag extra holds at most 80 characters');
select throws_ok(
  $$update public.race_drop_bags
    set extras = array_fill('Gel'::text, array[21])$$,
  '23514', null, 'a drop bag holds at most 20 extras');
select lives_ok(
  $$insert into public.race_nutrition_plans (race_id, user_id, plan)
    values ('a7000000-0000-4000-8000-0000000000c1', 'a7000000-0000-4000-8000-00000000000a', '{}')$$,
  'athlete stores a nutrition plan');

select throws_ok(
  $$update public.race_plans set flask_count = 7$$,
  '23514', null, 'flask count stays between 0 and 6');
select throws_ok(
  $$update public.race_plans set flask_ml = 50$$,
  '23514', null, 'flask volume stays between 100 and 1500 ml');
select throws_ok(
  $$update public.race_plans set bladder_ml = 4000$$,
  '23514', null, 'bladder volume stays between 250 and 3000 ml');
select throws_ok(
  $$update public.race_plans set caffeine_max_mg = 700$$,
  '23514', null, 'caffeine maximum stays at or below 600 mg');

select throws_ok(
  $$select public.submit_race_proposal('a7000000-0000-4000-8000-0000000000c1', 'nutrition',
    'Trop de glucides', '{"targets": {"carbsPerHourG": 150}}')$$,
  'PT400', null, 'nutrition targets outside the race plan ranges are refused');
select throws_ok(
  $$select public.submit_race_proposal('a7000000-0000-4000-8000-0000000000c1', 'nutrition',
    'Décimal', '{"targets": {"flaskCount": 1.5}}')$$,
  'PT400', null, 'nutrition targets are integers');
select throws_ok(
  $$select public.submit_race_proposal('a7000000-0000-4000-8000-0000000000c1', 'nutrition',
    'Inconnu', '{"targets": {"fatPerHourG": 10}}')$$,
  'PT400', null, 'unknown nutrition targets are refused');
select throws_ok(
  $$select public.submit_race_proposal('a7000000-0000-4000-8000-0000000000c1', 'nutrition',
    'Clé en trop', '{"targets": {"carbsPerHourG": 70}, "dropBag": ["Veste"]}')$$,
  'PT400', null, 'unknown nutrition payload keys are refused');
select lives_ok(
  $$select public.submit_race_proposal('a7000000-0000-4000-8000-0000000000c1', 'nutrition',
    'Cibles', '{"targets": {"carbsPerHourG": 70, "nightCaffeine": false, "bladderMl": null}}')$$,
  'valid nutrition targets are accepted');

update public.race_plans set carbs_per_hour_g = 65;
select is(
  public.accept_race_proposal((select id from public.race_proposals where title = 'Cibles')),
  'stale', 'editing a target makes a targets proposal stale');
select is(
  (select carbs_per_hour_g from public.race_plans), 65,
  'a stale targets proposal changes nothing');

select public.submit_race_proposal('a7000000-0000-4000-8000-0000000000c1', 'nutrition',
  'Cibles seules', '{"targets": {"carbsPerHourG": 72}}');
update public.race_nutrition_plans set plan = '{"products": {}}';
select is(
  public.accept_race_proposal((select id from public.race_proposals where title = 'Cibles seules')),
  'accepted', 'a targets-only proposal ignores nutrition plan edits');
select is(
  (select carbs_per_hour_g from public.race_plans), 72,
  'the targets-only proposal applies its target');

select public.submit_race_proposal('a7000000-0000-4000-8000-0000000000c1', 'nutrition',
  'Plan par tronçon',
  '{"plan": {"segments": {"a7000000-0000-4000-8000-0000000000f1": {"items": []}}}}');
update public.race_waypoints set distance_m = 11000
  where id = 'a7000000-0000-4000-8000-0000000000f1';
select is(
  public.accept_race_proposal((select id from public.race_proposals where title = 'Plan par tronçon')),
  'stale', 'moving a waypoint makes a per-segment nutrition proposal stale');

select public.submit_race_proposal('a7000000-0000-4000-8000-0000000000c1', 'strategy',
  'Stratégie par tronçon',
  '{"consignes": [], "segments": {"a7000000-0000-4000-8000-0000000000f1": {"paceFactor": 1.1}}}');
delete from public.race_waypoints where id = 'a7000000-0000-4000-8000-0000000000f2';
select is(
  public.accept_race_proposal((select id from public.race_proposals where title = 'Stratégie par tronçon')),
  'stale', 'removing a waypoint makes a per-segment strategy proposal stale');

select public.submit_race_proposal('a7000000-0000-4000-8000-0000000000c1', 'strategy',
  'Consignes seules', '{"consignes": ["Pars lentement."], "segments": {}}');
update public.race_waypoints set distance_m = 12000
  where id = 'a7000000-0000-4000-8000-0000000000f1';
select is(
  public.accept_race_proposal((select id from public.race_proposals where title = 'Consignes seules')),
  'accepted', 'a proposal without segments ignores waypoint edits');

select throws_ok(
  $$select public.reject_race_proposal(
    (select id from public.race_proposals where title = 'Consignes seules'))$$,
  'PT409', null, 'a decided proposal cannot be refused');
reset role;

select pg_temp.act_as('b7000000-0000-4000-8000-00000000000b');
select is((select count(*)::int from public.race_drop_bags), 0,
  'another athlete sees no drop bag');
select is((select count(*)::int from public.race_nutrition_plans), 0,
  'another athlete sees no nutrition plan');
select is(
  (select count(*)::int from public.race_proposals
    where id = 'a7000000-0000-4000-8000-0000000000e1'),
  0, 'another athlete cannot read a proposal by its id');
reset role;

select * from finish();
rollback;
