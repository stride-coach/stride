begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, aud, role, email)
values
  ('a0000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'race-a@example.com'),
  ('b0000000-0000-4000-8000-0000000000b1', 'authenticated', 'authenticated', 'race-b@example.com');

create function pg_temp.act_as(p_user uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.act_as('b0000000-0000-4000-8000-0000000000b1');
insert into public.athlete_races (id, user_id, name)
values ('b1000000-0000-4000-8000-0000000000b1', 'b0000000-0000-4000-8000-0000000000b1', 'Bea race');
reset role;

select pg_temp.act_as('a0000000-0000-4000-8000-0000000000a1');

select lives_ok(
  $$insert into public.athlete_races (id, user_id, name, location, poles, expectation, test_items)
    values ('a1000000-0000-4000-8000-0000000000a1', 'a0000000-0000-4000-8000-0000000000a1',
      'Trail de Chevreuse 45K', 'Chevreuse (78)', 'allowed', 'rehearsal',
      array['Départ de nuit', 'Frontale et batterie'])$$,
  'athlete creates a race with its goal details'
);

select results_eq(
  $$select location, poles, expectation, test_items from public.athlete_races
    where id = 'a1000000-0000-4000-8000-0000000000a1'$$,
  $$values ('Chevreuse (78)', 'allowed', 'rehearsal', array['Départ de nuit', 'Frontale et batterie'])$$,
  'athlete reads their goal details'
);

select lives_ok(
  $$update public.athlete_races set poles = 'forbidden', expectation = 'performance', test_items = null
    where id = 'a1000000-0000-4000-8000-0000000000a1'$$,
  'athlete updates their goal details'
);

select is_empty(
  $$update public.athlete_races set location = 'Ailleurs'
    where id = 'b1000000-0000-4000-8000-0000000000b1' returning id$$,
  'athlete cannot change another athlete''s race'
);

select throws_ok(
  $$update public.athlete_races set poles = 'sometimes'
    where id = 'a1000000-0000-4000-8000-0000000000a1'$$,
  '23514', null, 'poles accept only allowed, forbidden or unknown'
);

select throws_ok(
  $$update public.athlete_races set expectation = 'win'
    where id = 'a1000000-0000-4000-8000-0000000000a1'$$,
  '23514', null, 'expectation accepts only performance, rehearsal or fun'
);

select throws_ok(
  $$update public.athlete_races set location = '   '
    where id = 'a1000000-0000-4000-8000-0000000000a1'$$,
  '23514', null, 'location cannot be blank'
);

select throws_ok(
  $$update public.athlete_races set test_items = array['a','b','c','d','e','f','g','h','i']
    where id = 'a1000000-0000-4000-8000-0000000000a1'$$,
  '23514', null, 'at most eight things to test'
);

select throws_ok(
  $$update public.athlete_races set test_items = array[]::text[]
    where id = 'a1000000-0000-4000-8000-0000000000a1'$$,
  '23514', null, 'an empty list is stored as null'
);

select throws_ok(
  $$update public.athlete_races set test_items = array['ok', null]
    where id = 'a1000000-0000-4000-8000-0000000000a1'$$,
  '23514', null, 'things to test cannot be null'
);

select * from finish();
rollback;
