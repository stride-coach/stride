begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, aud, role, email)
values
  ('a0000000-0000-4000-8000-0000000000d1', 'authenticated', 'authenticated', 'fuel-a@example.com'),
  ('b0000000-0000-4000-8000-0000000000d2', 'authenticated', 'authenticated', 'fuel-b@example.com');

create function pg_temp.act_as(p_user uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.act_as('b0000000-0000-4000-8000-0000000000d2');
insert into public.fueling_tests (user_id, tested_on, carbs_per_hour_g, duration_seconds, tolerance)
values ('b0000000-0000-4000-8000-0000000000d2', '2026-10-04', 50, 7500, 'good');
reset role;

select ok(rowsecurity, 'fueling_tests has RLS enabled')
from pg_tables where schemaname = 'public' and tablename = 'fueling_tests';

set local role anon;
select throws_ok('select * from public.fueling_tests', '42501', null, 'anon cannot read fueling tests');
reset role;

select pg_temp.act_as('a0000000-0000-4000-8000-0000000000d1');

select lives_ok(
  $$insert into public.fueling_tests (user_id, tested_on, carbs_per_hour_g, duration_seconds, tolerance, note)
    values ('a0000000-0000-4000-8000-0000000000d1', '2026-10-11', 60, 8400, 'discomfort', 'Un peu lourd après 2 h')$$,
  'athlete records a fueling test'
);
select results_eq(
  $$select carbs_per_hour_g, tolerance from public.fueling_tests$$,
  $$values (60, 'discomfort')$$,
  'athlete reads only their own tests'
);
select throws_ok(
  $$insert into public.fueling_tests (user_id, tested_on, carbs_per_hour_g, duration_seconds, tolerance)
    values ('b0000000-0000-4000-8000-0000000000d2', '2026-10-11', 60, 8400, 'good')$$,
  '42501', null, 'athlete cannot record a test for another athlete'
);
select throws_ok(
  $$insert into public.fueling_tests (user_id, tested_on, carbs_per_hour_g, duration_seconds, tolerance)
    values ('a0000000-0000-4000-8000-0000000000d1', '2026-10-11', 200, 8400, 'good')$$,
  '23514', null, 'carbs per hour stay within a plausible range'
);
select throws_ok(
  $$insert into public.fueling_tests (user_id, tested_on, carbs_per_hour_g, duration_seconds, tolerance)
    values ('a0000000-0000-4000-8000-0000000000d1', '2026-10-11', 60, 8400, 'great')$$,
  '23514', null, 'tolerance is good, discomfort or not tolerated'
);
select is_empty(
  $$delete from public.fueling_tests where user_id = 'b0000000-0000-4000-8000-0000000000d2' returning id$$,
  'athlete cannot delete another athlete''s test'
);
select throws_ok(
  $$update public.fueling_tests set carbs_per_hour_g = 90$$,
  '42501', null, 'tests cannot be rewritten'
);

select * from finish();
rollback;
