begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (id, aud, role, email)
values
  ('a0000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'stop-a@example.com'),
  ('b0000000-0000-4000-8000-0000000000e2', 'authenticated', 'authenticated', 'stop-b@example.com');

create function pg_temp.act_as(p_user uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.act_as('b0000000-0000-4000-8000-0000000000e2');
insert into public.athlete_races (id, user_id, name)
values ('b1000000-0000-4000-8000-0000000000e2', 'b0000000-0000-4000-8000-0000000000e2', 'Bea race');
insert into public.race_waypoints (id, race_id, user_id, kind, name, distance_m)
values ('b2000000-0000-4000-8000-0000000000e2', 'b1000000-0000-4000-8000-0000000000e2',
  'b0000000-0000-4000-8000-0000000000e2', 'aid', 'Bea ravito', 10000);
reset role;

select pg_temp.act_as('a0000000-0000-4000-8000-0000000000e1');
insert into public.athlete_races (id, user_id, name)
values ('a1000000-0000-4000-8000-0000000000e1', 'a0000000-0000-4000-8000-0000000000e1', 'Ana race');

select lives_ok(
  $$insert into public.race_waypoints (id, race_id, user_id, kind, name, distance_m, stop_seconds)
    values ('a2000000-0000-4000-8000-0000000000e1', 'a1000000-0000-4000-8000-0000000000e1',
      'a0000000-0000-4000-8000-0000000000e1', 'aid', 'Meudon', 68000, 360)$$,
  'athlete sets a planned stop on their aid station'
);

select lives_ok(
  $$update public.race_waypoints set stop_seconds = null
    where id = 'a2000000-0000-4000-8000-0000000000e1'$$,
  'athlete clears the planned stop'
);

select throws_ok(
  $$update public.race_waypoints set stop_seconds = 7201
    where id = 'a2000000-0000-4000-8000-0000000000e1'$$,
  '23514', null, 'a planned stop lasts at most two hours'
);

select is_empty(
  $$update public.race_waypoints set stop_seconds = 60
    where id = 'b2000000-0000-4000-8000-0000000000e2' returning id$$,
  'athlete cannot change another athlete''s stop'
);

reset role;
select is(
  (select stop_seconds from public.race_waypoints where id = 'b2000000-0000-4000-8000-0000000000e2'),
  null,
  'the other athlete''s stop is untouched'
);

select * from finish();
rollback;
