begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (id, aud, role, email) values
  ('a3000000-0000-4000-8000-0000000000a3', 'authenticated', 'authenticated', 'authorship@example.com');

insert into public.training_plans (id, user_id, title, starts_on, ends_on, active_version, time_zone)
values
  ('30000000-0000-4000-8000-0000000000a3', 'a3000000-0000-4000-8000-0000000000a3', 'Plan A',
    current_date, current_date + 70, 3, 'Europe/Paris');

create function pg_temp.submit(
  p_keys text[],
  p_led_by text default null,
  p_initiated_by text default null
)
returns public.plan_proposals
language sql
as $$
  select public.submit_plan_proposal(
    'session', 'recovery', 'Séance allégée', 'Résumé', 'Raison',
    '[{"op": "skip_session", "sessionKey": "s-1"}]', '{"plan": null}',
    '30000000-0000-4000-8000-0000000000a3', 3,
    '[]', p_keys, null, p_led_by, p_initiated_by
  );
$$;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', 'a3000000-0000-4000-8000-0000000000a3', 'role', 'authenticated')::text,
  true
);
set local role authenticated;

select is(
  (select (led_by is null and initiated_by is null)
    from pg_temp.submit(array['s-1'])),
  true, 'authorship stays empty when the caller gives none, as before'
);
select is(
  (select led_by || ':' || initiated_by
    from pg_temp.submit(array['s-2'], 'medical', 'athlete')),
  'medical:athlete', 'the leading role and who initiated the proposal are stored'
);
select is(
  (select count(*)::integer from public.plan_proposals where status = 'superseded'),
  0, 'authorship does not change which proposals are superseded'
);
select throws_ok(
  $$select pg_temp.submit(array['s-3'], 'wizard', null)$$,
  'PT400', 'invalid_proposal', 'an unknown leading role is refused'
);
select throws_ok(
  $$select pg_temp.submit(array['s-3'], null, 'system')$$,
  'PT400', 'invalid_proposal', 'an unknown initiator is refused'
);
select lives_ok(
  $$select pg_temp.submit(array['s-4'], 'nutritionist', 'staff')$$,
  'every staff role and both initiators are accepted'
);
reset role;

select throws_ok(
  $$update public.plan_proposals set led_by = 'wizard'$$,
  '23514', null, 'the table itself rejects an unknown leading role'
);
select throws_ok(
  $$update public.plan_proposals set initiated_by = 'system'$$,
  '23514', null, 'the table itself rejects an unknown initiator'
);

select * from finish();
rollback;
