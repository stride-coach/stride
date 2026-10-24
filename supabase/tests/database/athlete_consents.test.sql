begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, aud, role, email) values
  ('c0000000-0000-4000-8000-00000000000c', 'authenticated', 'authenticated', 'consent-c@example.com'),
  ('d0000000-0000-4000-8000-00000000000d', 'authenticated', 'authenticated', 'consent-d@example.com');

create function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select ok(rowsecurity, 'consents have RLS enabled')
from pg_tables
where schemaname = 'public' and tablename = 'athlete_consents';

set local role anon;
select throws_ok(
  'select * from public.athlete_consents', '42501', null,
  'anonymous user cannot read consents'
);
reset role;

select pg_temp.act_as('c0000000-0000-4000-8000-00000000000c');
select lives_ok(
  $$insert into public.athlete_consents (user_id, purpose, policy_version)
    values ('c0000000-0000-4000-8000-00000000000c', 'health_data', '2026-10-24')$$,
  'athlete grants health-data consent'
);
select throws_ok(
  $$insert into public.athlete_consents (user_id, purpose, policy_version)
    values ('c0000000-0000-4000-8000-00000000000c', 'health_data', '2026-10-24')$$,
  '23505', null, 'only one consent is active at a time'
);
select throws_ok(
  $$insert into public.athlete_consents (user_id, purpose, policy_version, granted_at)
    values ('c0000000-0000-4000-8000-00000000000c', 'health_data', '2026-10-24', '2020-01-01')$$,
  '42501', null, 'the grant time cannot be chosen'
);
select throws_ok(
  $$insert into public.athlete_consents (user_id, purpose, policy_version)
    values ('d0000000-0000-4000-8000-00000000000d', 'health_data', '2026-10-24')$$,
  '42501', null, 'athlete cannot consent for another athlete'
);
select throws_ok(
  $$update public.athlete_consents set policy_version = '2027-01-01'$$,
  '42501', null, 'the policy version cannot be rewritten'
);
update public.athlete_consents set withdrawn_at = '2020-01-01'
  where purpose = 'health_data' and withdrawn_at is null;
select ok(
  (select withdrawn_at >= granted_at and withdrawn_at > now() - interval '1 minute'
    from public.athlete_consents),
  'withdrawal is stamped with the current time'
);
select lives_ok(
  $$insert into public.athlete_consents (user_id, purpose, policy_version)
    values ('c0000000-0000-4000-8000-00000000000c', 'health_data', '2026-10-24')$$,
  'athlete consents again after a withdrawal'
);
select is(
  (select count(*)::int from public.athlete_consents), 2,
  'the consent history is kept'
);
select throws_ok(
  $$delete from public.athlete_consents$$,
  '42501', null, 'consent history cannot be deleted'
);

select pg_temp.act_as('d0000000-0000-4000-8000-00000000000d');
select is(
  (select count(*)::int from public.athlete_consents), 0,
  'another athlete sees no consents'
);

select * from finish();
rollback;
