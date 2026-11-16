begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, aud, role, email) values
  ('a8000000-0000-4000-8000-0000000000a8', 'authenticated', 'authenticated', 'long-a@example.com'),
  ('b8000000-0000-4000-8000-0000000000b8', 'authenticated', 'authenticated', 'long-b@example.com');

create function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select vault.create_secret('https://stride.example.com/api/push/dispatch', 'push_dispatch_url');
select vault.create_secret('test-dispatch-secret', 'push_dispatch_secret');

select pg_temp.act_as('a8000000-0000-4000-8000-0000000000a8');
select public.register_push_subscription('https://fcm.googleapis.com/fcm/send/la', 'p256dh-la', 'auth-la', null);
reset role;

insert into public.coach_sessions (id, user_id, managed_session_id, mode, budget_cents, title)
values
  ('a8000000-0000-4000-8000-00000000c001', 'a8000000-0000-4000-8000-0000000000a8',
    'sesn_01LongA', 'plan', 100, 'Fil principal'),
  ('a8000000-0000-4000-8000-00000000c002', 'a8000000-0000-4000-8000-0000000000a8',
    'sesn_01LongB', 'plan', 100, 'Plan de mai');
insert into public.coach_thread_items (user_id, coach_session_id, kind, body) values
  ('a8000000-0000-4000-8000-0000000000a8', 'a8000000-0000-4000-8000-00000000c001', 'coach',
    '{"text": "Ton plan est prêt."}'),
  ('a8000000-0000-4000-8000-0000000000a8', 'a8000000-0000-4000-8000-00000000c002', 'coach',
    '{"text": "Ton plan de mai est prêt."}');

select pg_temp.act_as('a8000000-0000-4000-8000-0000000000a8');
update public.coach_sessions set notify_when_ready = true, writing_step = '{"step": 2, "total": 4, "label": "semaines de récupération"}'
  where id = 'a8000000-0000-4000-8000-00000000c001';
select is(
  (select notify_when_ready || '/' || (writing_step ->> 'label') from public.coach_sessions
    where id = 'a8000000-0000-4000-8000-00000000c001'),
  'true/semaines de récupération', 'the athlete opts in and the writer reports a step'
);
reset role;

update public.coach_sessions set status = 'idle', notify_when_ready = false, writing_step = null
  where id in ('a8000000-0000-4000-8000-00000000c001', 'a8000000-0000-4000-8000-00000000c002');

select is(
  (select string_agg(payload ->> 'notify', ',' order by payload ->> 'threadId') from public.notifications
    where kind = 'staff_reply'),
  'true,false', 'a finished turn records whether the athlete asked to be notified'
);

select private.push_tick();
select is(
  (select count(*)::int from public.push_deliveries where kind = 'staff_reply'), 1,
  'only the opted-in reply is pushed'
);
select is(
  (select payload ->> 'threadId' from public.push_deliveries where kind = 'staff_reply'),
  'a8000000-0000-4000-8000-00000000c001', 'the push targets the opted-in thread'
);

select private.push_tick();
select is(
  (select count(*)::int from public.push_deliveries where kind = 'staff_reply'), 1,
  'the reply is not pushed twice'
);

update public.coach_sessions set status = 'running', notify_when_ready = true
  where id = 'a8000000-0000-4000-8000-00000000c002';
update public.coach_sessions set status = 'idle', notify_when_ready = false, read_at = now()
  where id = 'a8000000-0000-4000-8000-00000000c002';
update public.notifications set read_at = now()
  where dedupe_key = 'staff_reply:a8000000-0000-4000-8000-00000000c002';
select private.push_tick();
select is(
  (select count(*)::int from public.push_deliveries where kind = 'staff_reply'), 1,
  'a reply the athlete already read is not pushed'
);

insert into public.push_preferences (user_id, plan_staff)
values ('a8000000-0000-4000-8000-0000000000a8', false);
update public.coach_sessions set status = 'running', notify_when_ready = true, read_at = null
  where id = 'a8000000-0000-4000-8000-00000000c001';
update public.coach_sessions set status = 'idle', notify_when_ready = false
  where id = 'a8000000-0000-4000-8000-00000000c001';
select private.push_tick();
select is(
  (select count(*)::int from public.push_deliveries where kind = 'staff_reply'), 1,
  'a switched-off staff category is not pushed even when the athlete opted in'
);

select pg_temp.act_as('b8000000-0000-4000-8000-0000000000b8');
select is(
  (select count(*)::int from public.coach_sessions where notify_when_ready), 0,
  'another athlete sees none of it'
);
reset role;

select * from finish();
rollback;
