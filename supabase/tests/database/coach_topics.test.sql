begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, aud, role, email) values
  ('a6000000-0000-4000-8000-0000000000a6', 'authenticated', 'authenticated', 'topic-a@example.com'),
  ('b6000000-0000-4000-8000-0000000000b6', 'authenticated', 'authenticated', 'topic-b@example.com');

insert into public.athlete_races (id, user_id, name) values
  ('a6000000-0000-4000-8000-00000000ace6', 'a6000000-0000-4000-8000-0000000000a6', 'EcoTrail'),
  ('b6000000-0000-4000-8000-00000000ace6', 'b6000000-0000-4000-8000-0000000000b6', 'Autre course');

create function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.act_as('a6000000-0000-4000-8000-0000000000a6');
select lives_ok(
  $$insert into public.coach_sessions (user_id, managed_session_id, mode, budget_cents, title)
    values ('a6000000-0000-4000-8000-0000000000a6',
      'sesn_01Legacy', 'conversation', 100, 'Ancienne conversation')$$,
  'the previous release still records a session without the new columns'
);
select is(
  (select kind || ':' || (closed_at is null)::text from public.coach_sessions
    where managed_session_id = 'sesn_01Legacy'),
  'topic:true',
  'a session recorded by the previous release is an open topic'
);
select lives_ok(
  $$insert into public.coach_sessions (user_id, managed_session_id, mode, budget_cents, title, kind)
    values ('a6000000-0000-4000-8000-0000000000a6',
      'sesn_01Main', 'conversation', 500, 'Fil principal', 'main')$$,
  'athlete opens a main-thread session'
);
select lives_ok(
  $$insert into public.coach_sessions (user_id, managed_session_id, mode, budget_cents, title, kind, race_id)
    values ('a6000000-0000-4000-8000-0000000000a6',
      'sesn_01Topic', 'conversation', 500, 'Préparer l’EcoTrail', 'topic',
      'a6000000-0000-4000-8000-00000000ace6')$$,
  'athlete opens a topic linked to their race'
);
select throws_ok(
  $$insert into public.coach_sessions (user_id, managed_session_id, mode, budget_cents, title, kind, race_id)
    values ('a6000000-0000-4000-8000-0000000000a6', 'sesn_01Foreign', 'conversation', 500,
      'Course d’un autre', 'topic', 'b6000000-0000-4000-8000-00000000ace6')$$,
  '42501', null, 'a topic cannot be linked to another athlete''s race'
);
select throws_ok(
  $$insert into public.coach_sessions (user_id, managed_session_id, mode, budget_cents, kind)
    values ('a6000000-0000-4000-8000-0000000000a6', 'sesn_01Other', 'conversation', 500, 'other')$$,
  '23514', null, 'unknown session kinds are rejected'
);
select lives_ok(
  $$update public.coach_sessions set title = 'Préparer l’EcoTrail 120K'
    where managed_session_id = 'sesn_01Topic'$$,
  'athlete renames a topic'
);
select throws_ok(
  $$update public.coach_sessions set closed_at = now()
    where managed_session_id = 'sesn_01Main'$$,
  '23514', null, 'the main thread is never closed'
);
select lives_ok(
  $$update public.coach_sessions set closed_at = now()
    where managed_session_id = 'sesn_01Topic'$$,
  'athlete closes a topic'
);
select throws_ok(
  $$update public.coach_sessions set closed_at = null
    where managed_session_id = 'sesn_01Topic'$$,
  '23514', null, 'a closed topic cannot be reopened'
);
select throws_ok(
  $$update public.coach_sessions set kind = 'main'$$,
  '42501', null, 'the kind is fixed at creation'
);
select lives_ok(
  $$insert into public.coach_thread_items (user_id, coach_session_id, kind, body)
    select 'a6000000-0000-4000-8000-0000000000a6', id, 'topic_summary', '{"title": "Préparer l’EcoTrail"}'
    from public.coach_sessions where managed_session_id = 'sesn_01Main'$$,
  'the summary card of a closed topic is recorded in the main thread'
);
reset role;

delete from public.athlete_races where id = 'a6000000-0000-4000-8000-00000000ace6';
select is(
  (select race_id from public.coach_sessions where managed_session_id = 'sesn_01Topic'),
  null::uuid,
  'deleting the race keeps the topic'
);

select pg_temp.act_as('b6000000-0000-4000-8000-0000000000b6');
select is(
  (select count(*)::int from public.coach_sessions), 0,
  'another athlete sees no topics'
);
reset role;

select * from finish();
rollback;
