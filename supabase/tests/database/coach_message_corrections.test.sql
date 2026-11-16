begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, aud, role, email) values
  ('a9000000-0000-4000-8000-0000000000a9', 'authenticated', 'authenticated', 'corr-a@example.com'),
  ('b9000000-0000-4000-8000-0000000000b9', 'authenticated', 'authenticated', 'corr-b@example.com');

create function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

insert into public.coach_sessions (id, user_id, managed_session_id, mode, budget_cents, title)
values
  ('a9000000-0000-4000-8000-00000000c0a9', 'a9000000-0000-4000-8000-0000000000a9',
    'sesn_01CorrA', 'conversation', 100, 'Fil principal'),
  ('a9000000-0000-4000-8000-00000000c1a9', 'a9000000-0000-4000-8000-0000000000a9',
    'sesn_01CorrA2', 'conversation', 100, 'Autre sujet'),
  ('b9000000-0000-4000-8000-00000000c0b9', 'b9000000-0000-4000-8000-0000000000b9',
    'sesn_01CorrB', 'conversation', 100, 'Fil principal');
insert into public.coach_thread_items (id, user_id, coach_session_id, kind, body) overriding system value values
  (9001, 'a9000000-0000-4000-8000-0000000000a9', 'a9000000-0000-4000-8000-00000000c0a9', 'coach',
    '{"text": "Feu vert de mon côté."}'),
  (9002, 'b9000000-0000-4000-8000-0000000000b9', 'b9000000-0000-4000-8000-00000000c0b9', 'coach',
    '{"text": "Message d''une autre athlète."}');

select ok(rowsecurity, 'message corrections have RLS enabled')
from pg_tables
where schemaname = 'public' and tablename = 'coach_message_corrections';

set local role anon;
select throws_ok(
  'select * from public.coach_message_corrections', '42501', null,
  'anonymous user cannot read corrections'
);
reset role;

select pg_temp.act_as('a9000000-0000-4000-8000-0000000000a9');
select lives_ok(
  $$insert into public.coach_message_corrections (user_id, coach_session_id, coach_thread_item_id, excerpt, text)
    values ('a9000000-0000-4000-8000-0000000000a9', 'a9000000-0000-4000-8000-00000000c0a9', 9001,
      'Feu vert de mon côté.', 'J''ai eu mal hier.')$$,
  'athlete corrects a message of their own thread'
);
select throws_ok(
  $$insert into public.coach_message_corrections (user_id, coach_session_id, coach_thread_item_id, excerpt, text)
    values ('a9000000-0000-4000-8000-0000000000a9', 'b9000000-0000-4000-8000-00000000c0b9', 9002,
      'Message', 'Intrus')$$,
  '42501', null, 'athlete cannot correct another athlete''s message'
);
select throws_ok(
  $$insert into public.coach_message_corrections (user_id, coach_session_id, coach_thread_item_id, excerpt, text)
    values ('a9000000-0000-4000-8000-0000000000a9', 'a9000000-0000-4000-8000-00000000c1a9', 9001,
      'Feu vert', 'Mauvais fil')$$,
  '42501', null, 'a correction must name the thread that holds the message'
);
select is(
  (select count(*)::int from public.coach_message_corrections), 1,
  'athlete reads their own corrections'
);
select lives_ok(
  $$update public.coach_message_corrections set delivered_at = now()$$,
  'athlete marks a correction as delivered'
);
select throws_ok(
  $$update public.coach_message_corrections set text = 'Réécrit'$$,
  '42501', null, 'a stored correction text cannot be rewritten'
);

select pg_temp.act_as('b9000000-0000-4000-8000-0000000000b9');
select is(
  (select count(*)::int from public.coach_message_corrections), 0,
  'another athlete sees no corrections'
);
select throws_ok(
  $$insert into public.coach_message_corrections (user_id, coach_session_id, coach_thread_item_id, excerpt, text)
    values ('a9000000-0000-4000-8000-0000000000a9', 'a9000000-0000-4000-8000-00000000c0a9', 9001,
      'Feu vert', 'Usurpé')$$,
  '42501', null, 'another athlete cannot write corrections as the owner'
);
reset role;

select * from finish();
rollback;
