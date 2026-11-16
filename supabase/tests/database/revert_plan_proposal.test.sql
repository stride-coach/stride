begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, aud, role, email) values
  ('a3000000-0000-4000-8000-0000000000a3', 'authenticated', 'authenticated', 'revert-a@example.com'),
  ('b3000000-0000-4000-8000-0000000000b3', 'authenticated', 'authenticated', 'revert-b@example.com');

insert into public.training_plans (id, user_id, title, starts_on, ends_on, active_version, time_zone)
values
  ('30000000-0000-4000-8000-0000000000a3', 'a3000000-0000-4000-8000-0000000000a3', 'Plan A',
    current_date - 7, current_date + 70, 2, 'Europe/Paris'),
  ('30000000-0000-4000-8000-0000000000b3', 'b3000000-0000-4000-8000-0000000000b3', 'Plan B',
    current_date - 7, current_date + 70, 2, 'Europe/Paris');

insert into public.plan_versions (
  plan_id, version, user_id, parent_version, created_by, effective_from, confidence, content_hash
)
select plan_id, version, user_id, nullif(version - 1, 0), 'coach', current_date - 7, '{}', 'hash'
from (values
  ('30000000-0000-4000-8000-0000000000a3'::uuid, 'a3000000-0000-4000-8000-0000000000a3'::uuid),
  ('30000000-0000-4000-8000-0000000000b3'::uuid, 'b3000000-0000-4000-8000-0000000000b3'::uuid)
) as plans (plan_id, user_id)
cross join (values (1), (2)) as versions (version);

create function pg_temp.session(
  p_plan uuid, p_user uuid, p_key text, p_on date, p_title text, p_from integer, p_to integer
)
returns void
language sql
as $$
  insert into public.plan_sessions (
    plan_id, user_id, session_key, valid_from_version, valid_to_version, scheduled_on, sport,
    kind, title, purpose, is_key, priority, targets, structure, origin
  ) values (
    p_plan, p_user, p_key, p_from, p_to, p_on, 'run', 'threshold', p_title, 'Seuil', true,
    'high', '{"durationSeconds": 3600}', '[]', 'coach'
  );
$$;

select pg_temp.session('30000000-0000-4000-8000-0000000000a3', 'a3000000-0000-4000-8000-0000000000a3',
  's-a', current_date + 1, 'Seuil 5 × 6’', 1, 2);
select pg_temp.session('30000000-0000-4000-8000-0000000000a3', 'a3000000-0000-4000-8000-0000000000a3',
  's-a', current_date + 1, 'Seuil 4 × 6’', 2, null);
select pg_temp.session('30000000-0000-4000-8000-0000000000a3', 'a3000000-0000-4000-8000-0000000000a3',
  's-b', current_date + 2, 'Footing', 1, null);
select pg_temp.session('30000000-0000-4000-8000-0000000000b3', 'b3000000-0000-4000-8000-0000000000b3',
  's-a', current_date - 1, 'Seuil 5 × 6’', 1, 2);
select pg_temp.session('30000000-0000-4000-8000-0000000000b3', 'b3000000-0000-4000-8000-0000000000b3',
  's-a', current_date - 1, 'Seuil 4 × 6’', 2, null);

insert into public.plan_proposals (
  id, user_id, plan_id, base_version, scope, origin, requested_by, status, title, operations,
  applied_version
) values
  ('3a000000-0000-4000-8000-0000000000a3', 'a3000000-0000-4000-8000-0000000000a3',
    '30000000-0000-4000-8000-0000000000a3', 1, 'session', 'recovery', 'athlete', 'applied',
    '4 × 6’ au lieu de 5 × 6’', '[]', 2),
  ('3b000000-0000-4000-8000-0000000000b3', 'b3000000-0000-4000-8000-0000000000b3',
    '30000000-0000-4000-8000-0000000000b3', 1, 'session', 'recovery', 'athlete', 'applied',
    '4 × 6’ au lieu de 5 × 6’', '[]', 2);

create function pg_temp.act_as(p_user uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.act_as('b3000000-0000-4000-8000-0000000000b3');
select throws_ok(
  $$select public.revert_plan_proposal('3a000000-0000-4000-8000-0000000000a3')$$,
  'PT404', 'not_found', 'an athlete cannot undo another athlete proposal'
);
select throws_ok(
  $$select public.revert_plan_proposal('3b000000-0000-4000-8000-0000000000b3')$$,
  'PT422', 'frozen_session', 'a session that has already started cannot be undone'
);
reset role;

select pg_temp.act_as('a3000000-0000-4000-8000-0000000000a3');
select is(
  public.revert_plan_proposal('3a000000-0000-4000-8000-0000000000a3'),
  3, 'undoing an applied proposal creates a new plan version'
);
select is(
  (select title from public.plan_sessions
    where plan_id = '30000000-0000-4000-8000-0000000000a3' and session_key = 's-a'
      and valid_to_version is null),
  'Seuil 5 × 6’', 'the session the proposal replaced is back'
);
select is(
  (select count(*)::integer from public.plan_sessions
    where plan_id = '30000000-0000-4000-8000-0000000000a3' and valid_to_version is null),
  2, 'the untouched session stays current and no session is duplicated'
);
select is(
  (select active_version from public.training_plans
    where id = '30000000-0000-4000-8000-0000000000a3'),
  3, 'the plan moves to the new version'
);
select is(
  (select parent_version || ':' || created_by from public.plan_versions
    where plan_id = '30000000-0000-4000-8000-0000000000a3' and version = 3),
  '2:athlete', 'the new version follows the applied one and is the athlete''s'
);
select is(
  (select status from public.plan_proposals where id = '3a000000-0000-4000-8000-0000000000a3'),
  'reverted', 'the proposal is marked reverted'
);
select is(
  (select decision || ':' || actor || ':' || resulting_version from public.plan_decisions
    where proposal_id = '3a000000-0000-4000-8000-0000000000a3'),
  'reverted:athlete:3', 'the undo is recorded as a decision'
);
select throws_ok(
  $$select public.revert_plan_proposal('3a000000-0000-4000-8000-0000000000a3')$$,
  'PT409', 'invalid_state', 'a reverted proposal cannot be undone twice'
);
reset role;

select * from finish();
rollback;
