begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, aud, role, email)
values
  ('a0000000-0000-4000-8000-0000000001e1', 'authenticated', 'authenticated', 'lesson-a@example.com'),
  ('b0000000-0000-4000-8000-0000000001e2', 'authenticated', 'authenticated', 'lesson-b@example.com');

insert into public.athlete_races (id, user_id, name, race_date, priority, race_kind)
values
  ('a0000000-0000-4000-8000-0000000001f1', 'a0000000-0000-4000-8000-0000000001e1', 'EcoTrail', '2026-03-20', 'A', 'trail'),
  ('b0000000-0000-4000-8000-0000000001f2', 'b0000000-0000-4000-8000-0000000001e2', 'Maxicross', '2026-01-31', 'B', 'trail');

insert into public.race_lessons (race_id, user_id, kind, body)
values ('b0000000-0000-4000-8000-0000000001f2', 'b0000000-0000-4000-8000-0000000001e2', 'keep', 'Le sien');

create function pg_temp.act_as(p_user uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select ok(rowsecurity, 'race_lessons has RLS enabled')
from pg_tables where schemaname = 'public' and tablename = 'race_lessons';

set local role anon;
select throws_ok('select * from public.race_lessons', '42501', null, 'anon cannot read lessons');
reset role;

select pg_temp.act_as('a0000000-0000-4000-8000-0000000001e1');

select lives_ok(
  $$insert into public.race_lessons (race_id, user_id, kind, body)
    values ('a0000000-0000-4000-8000-0000000001f1', 'a0000000-0000-4000-8000-0000000001e1', 'change', 'Le ravitaillement de nuit')$$,
  'athlete keeps a lesson on their race'
);
select results_eq(
  $$select kind, body from public.race_lessons$$,
  $$values ('change'::text, 'Le ravitaillement de nuit'::text)$$,
  'athlete reads only their own lessons'
);
select throws_ok(
  $$insert into public.race_lessons (race_id, user_id, kind, body)
    values ('b0000000-0000-4000-8000-0000000001f2', 'a0000000-0000-4000-8000-0000000001e1', 'keep', 'Intrus')$$,
  '42501', null, 'athlete cannot add a lesson to another athlete''s race'
);
select throws_ok(
  $$insert into public.race_lessons (race_id, user_id, kind, body)
    values ('a0000000-0000-4000-8000-0000000001f1', 'a0000000-0000-4000-8000-0000000001e1', 'maybe', 'Flou')$$,
  '23514', null, 'a lesson is kept or changed'
);
select throws_ok(
  $$update public.race_lessons set body = 'Autre'$$,
  '42501', null, 'lessons are not edited in place'
);
select is_empty(
  $$delete from public.race_lessons
    where user_id = 'b0000000-0000-4000-8000-0000000001e2' returning id$$,
  'athlete cannot delete another athlete''s lesson'
);

select * from finish();
rollback;
