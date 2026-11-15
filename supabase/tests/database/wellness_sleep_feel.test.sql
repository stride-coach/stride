begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, aud, role, email) values
  ('e1000000-0000-4000-8000-00000000000e', 'authenticated', 'authenticated', 'sleep-e@example.com'),
  ('f1000000-0000-4000-8000-00000000000f', 'authenticated', 'authenticated', 'sleep-f@example.com');

create function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.act_as('e1000000-0000-4000-8000-00000000000e');
select lives_ok(
  $$insert into public.athlete_wellness_checkins (user_id, checkin_date, sleep_feel)
    values ('e1000000-0000-4000-8000-00000000000e', '2026-11-15', 'good')
    on conflict (user_id, checkin_date) do update set sleep_feel = excluded.sleep_feel$$,
  'athlete records how the night felt'
);
select lives_ok(
  $$update public.athlete_wellness_checkins set sleep_feel = 'poor'
    where user_id = 'e1000000-0000-4000-8000-00000000000e' and checkin_date = '2026-11-15'$$,
  'athlete changes the felt sleep'
);
select throws_ok(
  $$update public.athlete_wellness_checkins set sleep_feel = 'great'
    where user_id = 'e1000000-0000-4000-8000-00000000000e'$$,
  '23514', null,
  'felt sleep only accepts the three answers'
);

select pg_temp.act_as('f1000000-0000-4000-8000-00000000000f');
select is_empty(
  $$select 1 from public.athlete_wellness_checkins
    where user_id = 'e1000000-0000-4000-8000-00000000000e'$$,
  'another athlete cannot read the felt sleep'
);

select * from finish();
rollback;
