begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, aud, role, email)
values
  ('a0000000-0000-4000-8000-000000000501', 'authenticated', 'authenticated', 'checkin-a@example.com'),
  ('b0000000-0000-4000-8000-000000000502', 'authenticated', 'authenticated', 'checkin-b@example.com');

insert into public.athlete_races (id, user_id, name, race_date, priority, race_kind)
values
  ('a0000000-0000-4000-8000-000000000511', 'a0000000-0000-4000-8000-000000000501', 'EcoTrail', '2027-03-20', 'A', 'trail'),
  ('a0000000-0000-4000-8000-000000000512', 'a0000000-0000-4000-8000-000000000501', 'Maxicross', '2027-01-31', 'B', 'trail'),
  ('b0000000-0000-4000-8000-000000000513', 'b0000000-0000-4000-8000-000000000502', 'Saintélyon', '2026-12-05', 'A', 'trail');

insert into public.race_waypoints (id, race_id, user_id, kind, name, distance_m)
values
  ('a0000000-0000-4000-8000-000000000521', 'a0000000-0000-4000-8000-000000000511', 'a0000000-0000-4000-8000-000000000501', 'aid', 'Buc', 24000),
  ('a0000000-0000-4000-8000-000000000522', 'a0000000-0000-4000-8000-000000000512', 'a0000000-0000-4000-8000-000000000501', 'aid', 'Bièvres', 12000),
  ('b0000000-0000-4000-8000-000000000523', 'b0000000-0000-4000-8000-000000000513', 'b0000000-0000-4000-8000-000000000502', 'aid', 'Soucieu', 22000);

insert into public.race_checkins (race_id, waypoint_id, user_id, checked_at)
values ('b0000000-0000-4000-8000-000000000513', 'b0000000-0000-4000-8000-000000000523', 'b0000000-0000-4000-8000-000000000502', '2026-12-06 03:10+01');

create function pg_temp.act_as(p_user uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select ok(rowsecurity, 'race_checkins has RLS enabled')
from pg_tables where schemaname = 'public' and tablename = 'race_checkins';

select pg_temp.act_as('a0000000-0000-4000-8000-000000000501');

select lives_ok(
  $$insert into public.race_checkins (race_id, waypoint_id, user_id, checked_at)
    values ('a0000000-0000-4000-8000-000000000511', 'a0000000-0000-4000-8000-000000000521', 'a0000000-0000-4000-8000-000000000501', '2027-03-20 10:14+01')$$,
  'athlete checks in at an aid station of their race'
);
select results_eq(
  $$insert into public.race_checkins (race_id, waypoint_id, user_id, checked_at)
    values ('a0000000-0000-4000-8000-000000000511', 'a0000000-0000-4000-8000-000000000521', 'a0000000-0000-4000-8000-000000000501', '2027-03-20 10:16+01')
    on conflict (race_id, waypoint_id) do update set checked_at = excluded.checked_at, updated_at = now()
    returning checked_at$$,
  $$values ('2027-03-20 10:16+01'::timestamptz)$$,
  'sending the same check-in again corrects it'
);
select results_eq(
  $$select count(*)::int from public.race_checkins$$,
  $$values (1)$$,
  'athlete reads only their own check-ins'
);
select throws_ok(
  $$insert into public.race_checkins (race_id, waypoint_id, user_id, checked_at)
    values ('a0000000-0000-4000-8000-000000000511', 'a0000000-0000-4000-8000-000000000522', 'a0000000-0000-4000-8000-000000000501', now())$$,
  '42501', null, 'a check-in stays on a waypoint of the same race'
);
select throws_ok(
  $$insert into public.race_checkins (race_id, waypoint_id, user_id, checked_at)
    values ('b0000000-0000-4000-8000-000000000513', 'b0000000-0000-4000-8000-000000000523', 'a0000000-0000-4000-8000-000000000501', now())$$,
  '42501', null, 'athlete cannot check in on another athlete''s race'
);
select throws_ok(
  $$update public.race_checkins set user_id = 'b0000000-0000-4000-8000-000000000502'$$,
  '42501', null, 'a check-in keeps its owner'
);
select results_eq(
  $$with removed as (delete from public.race_checkins returning 1) select count(*)::int from removed$$,
  $$values (1)$$,
  'athlete removes their own check-in'
);

select * from finish();
rollback;
