begin;

create extension if not exists pgtap with schema extensions;
select plan(38);

insert into auth.users (id, aud, role, email) values
  ('a6000000-0000-4000-8000-00000000000a', 'authenticated', 'authenticated', 'race-proposal-a@example.com'),
  ('b6000000-0000-4000-8000-00000000000b', 'authenticated', 'authenticated', 'race-proposal-b@example.com');

insert into public.athlete_races (id, user_id, name, race_kind, priority) values
  ('a6000000-0000-4000-8000-0000000000c1', 'a6000000-0000-4000-8000-00000000000a',
   'EcoTrail Paris', 'trail', 'A'),
  ('b6000000-0000-4000-8000-0000000000c2', 'b6000000-0000-4000-8000-00000000000b',
   'Trail B', 'trail', 'A');

create function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select ok(rowsecurity, tablename || ' has RLS enabled')
from pg_tables
where schemaname = 'public'
  and tablename in (
    'race_strategies', 'athlete_nutrition_products', 'race_nutrition_plans', 'race_proposals'
  );

set local role anon;
select throws_ok('select * from public.race_strategies', '42501', null,
  'anonymous user cannot read strategies');
select throws_ok('select * from public.athlete_nutrition_products', '42501', null,
  'anonymous user cannot read products');
select throws_ok('select * from public.race_nutrition_plans', '42501', null,
  'anonymous user cannot read nutrition plans');
select throws_ok('select * from public.race_proposals', '42501', null,
  'anonymous user cannot read race proposals');
reset role;

select pg_temp.act_as('a6000000-0000-4000-8000-00000000000a');

select lives_ok(
  $$insert into public.athlete_nutrition_products
      (user_id, catalogue_key, name, brand, kind, carbs_g, sodium_mg, caffeine_mg, serving_label)
    values ('a6000000-0000-4000-8000-00000000000a', 'maurten-gel-100', 'Gel 100', 'Maurten',
      'gel', 25, 20, 0, '1 gel 40 g')$$,
  'athlete adds a catalogue product');
select throws_ok(
  $$insert into public.athlete_nutrition_products
      (user_id, catalogue_key, name, kind, carbs_g)
    values ('a6000000-0000-4000-8000-00000000000a', 'maurten-gel-100', 'Gel 100', 'gel', 25)$$,
  '23505', null, 'a catalogue product is added once');
select throws_ok(
  $$insert into public.athlete_nutrition_products (user_id, name, kind, carbs_g)
    values ('a6000000-0000-4000-8000-00000000000a', 'Gel maison', 'gel', 250)$$,
  '23514', null, 'carbs above 200 g are refused');
select throws_ok(
  $$insert into public.athlete_nutrition_products (user_id, name, kind, carbs_g)
    values ('b6000000-0000-4000-8000-00000000000b', 'Gel volé', 'gel', 20)$$,
  '42501', null, 'athlete cannot add a product for someone else');
select lives_ok(
  $$update public.athlete_nutrition_products set tested = true, tested_note = 'Sortie longue'
    where catalogue_key = 'maurten-gel-100'$$,
  'athlete marks a product as tested');
select is(
  (select revision from public.athlete_nutrition_products where catalogue_key = 'maurten-gel-100'),
  2, 'product revision advances');
select throws_ok(
  $$update public.athlete_nutrition_products set user_id = 'b6000000-0000-4000-8000-00000000000b'$$,
  '42501', null, 'athlete cannot move a product to another owner');

select throws_ok(
  $$insert into public.race_checklist_items (race_id, user_id, list, label)
    values ('a6000000-0000-4000-8000-0000000000c1', 'a6000000-0000-4000-8000-00000000000a',
      'drop_bag', 'Chaussettes de rechange')$$,
  '23514', null, 'checklist lists stay those the production release parses');
select lives_ok(
  $$insert into public.race_plans (race_id, user_id, flask_ml, flask_count, bladder_ml, caffeine_max_mg)
    values ('a6000000-0000-4000-8000-0000000000c1', 'a6000000-0000-4000-8000-00000000000a',
      500, 2, 1500, 200)$$,
  'athlete stores flask, bladder and caffeine settings');

select throws_ok(
  $$insert into public.race_strategies (race_id, user_id, consignes)
    values ('a6000000-0000-4000-8000-0000000000c1', 'a6000000-0000-4000-8000-00000000000a',
      '["1","2","3","4","5","6","7"]')$$,
  '23514', null, 'a strategy holds at most six instructions');
select throws_ok(
  $$insert into public.race_strategies (race_id, user_id, segments)
    values ('a6000000-0000-4000-8000-0000000000c1', 'a6000000-0000-4000-8000-00000000000a',
      '{"a6000000-0000-4000-8000-0000000000f1": {"paceFactor": 1.5}}')$$,
  '23514', null, 'a pace factor stays between 0.8 and 1.2');
select throws_ok(
  $$insert into public.race_strategies (race_id, user_id)
    values ('b6000000-0000-4000-8000-0000000000c2', 'a6000000-0000-4000-8000-00000000000a')$$,
  '42501', null, 'athlete cannot write a strategy on another athlete''s race');

select throws_ok(
  $$insert into public.race_proposals (user_id, race_id, kind, title, payload)
    values ('a6000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-0000000000c1',
      'strategy', 'Direct', '{}')$$,
  '42501', null, 'athlete cannot insert a proposal directly');
select throws_ok(
  $$select public.submit_race_proposal('b6000000-0000-4000-8000-0000000000c2', 'strategy',
    'Stratégie', '{"consignes": ["Pars lentement."], "segments": {}}')$$,
  'PT404', null, 'a proposal on another athlete''s race is refused');
select throws_ok(
  $$select public.submit_race_proposal('a6000000-0000-4000-8000-0000000000c1', 'strategy',
    'Stratégie', '{"consignes": ["Pars lentement."], "segments": {"x": {"note": "?"}}}')$$,
  'PT400', null, 'an invalid strategy payload is refused');

select public.submit_race_proposal('a6000000-0000-4000-8000-0000000000c1', 'strategy',
  'Première stratégie',
  '{"consignes": ["Pars lentement."], "segments": {}}');
select public.submit_race_proposal('a6000000-0000-4000-8000-0000000000c1', 'strategy',
  'Stratégie du stratège',
  '{"consignes": ["Pars lentement.", "Marche dès 10 %."],
    "segments": {"a6000000-0000-4000-8000-0000000000f1": {"note": "Reste sous 150 bpm.", "paceFactor": 1.05}}}',
  'Deux consignes et un tronçon plus prudent.');
select is(
  (select array_agg(status order by created_at, title) from public.race_proposals),
  array['superseded', 'ready'], 'a new strategy proposal supersedes the ready one');
select is(
  (select count(*)::int from public.race_strategies), 0,
  'submitting a proposal writes no strategy');

select is(
  public.accept_race_proposal(
    (select id from public.race_proposals where status = 'ready')),
  'accepted', 'athlete accepts the strategy proposal');
select is(
  (select consignes from public.race_strategies),
  '["Pars lentement.", "Marche dès 10 %."]'::jsonb, 'accepting writes the instructions');
select is(
  (select (segments -> 'a6000000-0000-4000-8000-0000000000f1' ->> 'paceFactor')::numeric
    from public.race_strategies),
  1.05, 'accepting writes the pace factors');
select throws_ok(
  $$select public.accept_race_proposal(
    (select id from public.race_proposals where title = 'Stratégie du stratège'))$$,
  'PT409', null, 'a decided proposal cannot be accepted again');

select public.submit_race_proposal('a6000000-0000-4000-8000-0000000000c1', 'strategy',
  'Ancienne base', '{"consignes": [], "segments": {}}');
update public.race_strategies set consignes = '["Changé à la main."]';
select is(
  public.accept_race_proposal(
    (select id from public.race_proposals where title = 'Ancienne base')),
  'stale', 'a proposal on an outdated strategy is marked stale');
select is(
  (select consignes from public.race_strategies),
  '["Changé à la main."]'::jsonb, 'a stale proposal changes nothing');

select public.submit_race_proposal('a6000000-0000-4000-8000-0000000000c1', 'nutrition',
  'Nutrition',
  '{"plan": {"segments": {}}, "targets": {"carbsPerHourG": 75, "flaskMl": 600, "bladderMl": null}}');
select is(
  public.accept_race_proposal(
    (select id from public.race_proposals where kind = 'nutrition')),
  'accepted', 'athlete accepts the nutrition proposal');
select results_eq(
  $$select carbs_per_hour_g, flask_ml, bladder_ml, flask_count from public.race_plans$$,
  $$values (75, 600, null::integer, 2)$$,
  'accepting the nutrition proposal updates only the proposed targets');
select is(
  (select plan from public.race_nutrition_plans), '{"segments": {}}'::jsonb,
  'accepting the nutrition proposal stores the plan');

select public.submit_race_proposal('a6000000-0000-4000-8000-0000000000c1', 'strategy',
  'À refuser', '{"consignes": ["Non."], "segments": {}}');
select lives_ok(
  $$select public.reject_race_proposal(
    (select id from public.race_proposals where title = 'À refuser'))$$,
  'athlete refuses a proposal');
select is(
  (select consignes from public.race_strategies),
  '["Changé à la main."]'::jsonb, 'refusing keeps the current strategy');
reset role;

select pg_temp.act_as('b6000000-0000-4000-8000-00000000000b');
select is(
  (select count(*)::int from public.race_proposals), 0,
  'another athlete sees no proposal');
select throws_ok(
  $$select public.accept_race_proposal(
    (select id from public.race_proposals limit 1))$$,
  'PT404', null, 'another athlete cannot accept a proposal');
reset role;

select * from finish();
rollback;
