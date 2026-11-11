begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, aud, role, email) values
  ('a3000000-0000-4000-8000-0000000000a3', 'authenticated', 'authenticated', 'move-a@example.com'),
  ('b3000000-0000-4000-8000-0000000000b3', 'authenticated', 'authenticated', 'move-b@example.com');

insert into public.training_plans (id, user_id, title, starts_on, ends_on, active_version, time_zone)
values
  ('30000000-0000-4000-8000-0000000000a3', 'a3000000-0000-4000-8000-0000000000a3', 'Plan A',
    current_date, current_date + 70, 3, 'Europe/Paris');

create function pg_temp.act_as(p_user uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

create function pg_temp.move(p_base_version integer)
returns public.plan_proposals
language sql
as $$
  select public.submit_athlete_session_move(
    '30000000-0000-4000-8000-0000000000a3', p_base_version, 's-1', current_date + 1,
    'Séance déplacée', 'Résumé', '{"plan": null}'
  );
$$;

select pg_temp.act_as('a3000000-0000-4000-8000-0000000000a3');

select public.submit_plan_proposal(
  'session', 'recovery', 'Footing court', 'Résumé', 'Raison',
  '[{"op": "skip_session", "sessionKey": "s-1"}]', '{"plan": null}',
  '30000000-0000-4000-8000-0000000000a3', 3, '[]', array['s-1']
);

select is(
  (pg_temp.move(3)).status,
  'accepted', 'the athlete move is recorded as already accepted'
);
select is(
  (select operations from public.plan_proposals where status = 'accepted'),
  jsonb_build_array(jsonb_build_object(
    'op', 'move_session', 'sessionKey', 's-1',
    'toDate', to_char(current_date + 1, 'YYYY-MM-DD')
  )),
  'the move holds only the move_session operation built by the database'
);
select is(
  (select requested_by || ':' || origin || ':' || target_keys::text
    from public.plan_proposals where status = 'accepted'),
  'athlete:schedule:{s-1}', 'the move belongs to the athlete and targets the session'
);
select is(
  (select count(*)::integer from public.plan_proposals where status = 'ready'),
  1, 'a ready coach proposal on the same session is not superseded'
);
select is(
  (select decision || ':' || actor from public.plan_decisions
    where proposal_id = (select id from public.plan_proposals where status = 'accepted')),
  'accepted:athlete', 'the acceptance is logged as the athlete decision'
);
select is(
  (select count(*)::integer from public.notifications
    where dedupe_key = 'plan_proposal:' || (select id from public.plan_proposals where status = 'accepted')),
  0, 'the move creates no coach proposal notification'
);
select throws_ok(
  $$select public.submit_athlete_session_move(
    '30000000-0000-4000-8000-0000000000a3', 3, 's-1', current_date + 1,
    'Séance déplacée', 'Résumé', '{"plan": null}', 's-unknown'
  )$$,
  'PT400', 'invalid_proposal', 'a rest key that is not a rest session that day is refused'
);
select throws_ok(
  $$select pg_temp.move(2)$$,
  'PT409', 'stale_version', 'a move on an old version is refused'
);
reset role;

select pg_temp.act_as('b3000000-0000-4000-8000-0000000000b3');
select throws_ok(
  $$select pg_temp.move(3)$$,
  'PT404', 'not_found', 'an athlete cannot move a session of another athlete plan'
);
reset role;

select set_config('request.jwt.claims', '{"role": "anon"}', true);
set local role anon;
select throws_ok(
  $$select public.submit_athlete_session_move(
    '30000000-0000-4000-8000-0000000000a3', 3, 's-1', current_date + 1, 'x', 'y', '{}'
  )$$,
  '42501', null, 'an anonymous caller cannot move a session'
);
reset role;

select * from finish();
rollback;
