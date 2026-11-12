begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (id, aud, role, email)
values
  ('a0000000-0000-4000-8000-0000000000f1', 'authenticated', 'authenticated', 'crew-a@example.com'),
  ('b0000000-0000-4000-8000-0000000000f2', 'authenticated', 'authenticated', 'crew-b@example.com');

create function pg_temp.act_as(p_user uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.act_as('b0000000-0000-4000-8000-0000000000f2');
insert into public.athlete_races (id, user_id, name)
values ('b1000000-0000-4000-8000-0000000000f2', 'b0000000-0000-4000-8000-0000000000f2', 'Bea race');
insert into public.race_waypoints (id, race_id, user_id, kind, name, distance_m)
values ('b2000000-0000-4000-8000-0000000000f2', 'b1000000-0000-4000-8000-0000000000f2',
  'b0000000-0000-4000-8000-0000000000f2', 'aid', 'Bea ravito', 10000);
reset role;

select pg_temp.act_as('a0000000-0000-4000-8000-0000000000f1');
insert into public.athlete_races (id, user_id, name)
values ('a1000000-0000-4000-8000-0000000000f1', 'a0000000-0000-4000-8000-0000000000f1', 'Ana race');

select lives_ok(
  $$insert into public.race_waypoints (id, race_id, user_id, kind, name, distance_m, crew_access, crew_prepare)
    values ('a2000000-0000-4000-8000-0000000000f1', 'a1000000-0000-4000-8000-0000000000f1',
      'a0000000-0000-4000-8000-0000000000f1', 'aid', 'Chaville', 47000,
      'Gare de Chaville, 8 min à pied', 'Repas chaud, veste')$$,
  'athlete notes how their crew reaches an aid station and what to prepare'
);

select lives_ok(
  $$update public.race_waypoints set crew_access = null, crew_reason = 'Assistance interdite'
    where id = 'a2000000-0000-4000-8000-0000000000f1'$$,
  'athlete notes why there is no assistance'
);

select throws_ok(
  $$update public.race_waypoints set crew_prepare = '   '
    where id = 'a2000000-0000-4000-8000-0000000000f1'$$,
  '23514', null, 'crew notes cannot be blank'
);

select is_empty(
  $$update public.race_waypoints set crew_access = 'Ailleurs'
    where id = 'b2000000-0000-4000-8000-0000000000f2' returning id$$,
  'athlete cannot change another athlete''s crew notes'
);

reset role;
select is(
  (select crew_access from public.race_waypoints where id = 'b2000000-0000-4000-8000-0000000000f2'),
  null,
  'the other athlete''s crew notes are untouched'
);

select * from finish();
rollback;
