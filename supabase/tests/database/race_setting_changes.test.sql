begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, aud, role, email)
values
  ('a0000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', 'settings-a@example.com'),
  ('b0000000-0000-4000-8000-0000000000c2', 'authenticated', 'authenticated', 'settings-b@example.com');

create function pg_temp.act_as(p_user uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.act_as('a0000000-0000-4000-8000-0000000000c1');
insert into public.athlete_races (id, user_id, name)
values ('a1000000-0000-4000-8000-0000000000c1', 'a0000000-0000-4000-8000-0000000000c1', 'Ana race');
reset role;
select pg_temp.act_as('b0000000-0000-4000-8000-0000000000c2');
insert into public.athlete_races (id, user_id, name)
values ('b1000000-0000-4000-8000-0000000000c2', 'b0000000-0000-4000-8000-0000000000c2', 'Bea race');
insert into public.race_setting_changes (race_id, user_id, setting, previous_value, value)
values ('b1000000-0000-4000-8000-0000000000c2', 'b0000000-0000-4000-8000-0000000000c2', 'aid_stop', 300, 360);
reset role;

select ok(rowsecurity, 'race_setting_changes has RLS enabled')
from pg_tables where schemaname = 'public' and tablename = 'race_setting_changes';

set local role anon;
select throws_ok('select * from public.race_setting_changes', '42501', null, 'anon cannot read setting changes');
reset role;

select pg_temp.act_as('a0000000-0000-4000-8000-0000000000c1');

select lives_ok(
  $$insert into public.race_setting_changes (race_id, user_id, setting, previous_value, value)
    values ('a1000000-0000-4000-8000-0000000000c1', 'a0000000-0000-4000-8000-0000000000c1', 'walk_grade', 10, 8)$$,
  'athlete records a change on their own race'
);
select results_eq(
  $$select setting, previous_value, value from public.race_setting_changes$$,
  $$values ('walk_grade', 10, 8)$$,
  'athlete reads only their own changes'
);
select throws_ok(
  $$insert into public.race_setting_changes (race_id, user_id, setting, value)
    values ('b1000000-0000-4000-8000-0000000000c2', 'a0000000-0000-4000-8000-0000000000c1', 'aid_stop', 60)$$,
  '42501', null, 'athlete cannot record a change on another athlete''s race'
);
select throws_ok(
  $$insert into public.race_setting_changes (race_id, user_id, setting, value)
    values ('a1000000-0000-4000-8000-0000000000c1', 'b0000000-0000-4000-8000-0000000000c2', 'aid_stop', 60)$$,
  '42501', null, 'athlete cannot record a change for another athlete'
);
select throws_ok(
  $$insert into public.race_setting_changes (race_id, user_id, setting, value)
    values ('a1000000-0000-4000-8000-0000000000c1', 'a0000000-0000-4000-8000-0000000000c1', 'heart_rate', 150)$$,
  '23514', null, 'only known settings are recorded'
);
select throws_ok(
  $$update public.race_setting_changes set value = 9$$,
  '42501', null, 'changes cannot be rewritten'
);
reset role;

delete from public.athlete_races where id = 'a1000000-0000-4000-8000-0000000000c1';
select is(
  (select count(*)::integer from public.race_setting_changes
    where race_id = 'a1000000-0000-4000-8000-0000000000c1'),
  0,
  'changes go away with their race'
);

select * from finish();
rollback;
