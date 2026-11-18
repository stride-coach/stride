begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, aud, role, email) values
  ('c9100000-0000-4000-8000-0000000000c9', 'authenticated', 'authenticated', 'observed-a@example.com'),
  ('d9100000-0000-4000-8000-0000000000d9', 'authenticated', 'authenticated', 'observed-b@example.com');

create function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.act_as('c9100000-0000-4000-8000-0000000000c9');
select lives_ok(
  $$insert into public.athlete_facts (user_id, category, text, origin, basis)
    values ('c9100000-0000-4000-8000-0000000000c9', 'habit', 'En semaine, tu cours avant 7:30', 'observed', '5 semaines de données')$$,
  'an observed fact carries its basis'
);
select throws_ok(
  $$insert into public.athlete_facts (user_id, category, text, origin)
    values ('c9100000-0000-4000-8000-0000000000c9', 'habit', 'Sans base', 'observed')$$,
  '23514', null, 'an observed fact needs a basis'
);
select throws_ok(
  $$insert into public.athlete_facts (user_id, category, text, basis)
    values ('c9100000-0000-4000-8000-0000000000c9', 'habit', 'Dit par toi', 'Une base')$$,
  '23514', null, 'a fact the athlete said has no basis'
);
select throws_ok(
  $$insert into public.athlete_facts (user_id, category, text, origin, basis)
    values ('c9100000-0000-4000-8000-0000000000c9', 'habit', 'Base trop longue', 'observed', repeat('x', 61))$$,
  '23514', null, 'a basis stays short'
);
select lives_ok(
  $$insert into public.athlete_facts (user_id, category, text)
    values ('c9100000-0000-4000-8000-0000000000c9', 'goal', 'Un objectif écrit par toi')$$,
  'a fact inserted without an origin is what the athlete said'
);
select is(
  (select origin from public.athlete_facts where text = 'Un objectif écrit par toi'),
  'said', 'the default origin is said'
);
select lives_ok(
  $$update public.athlete_facts set confirmed_at = now() where text = 'En semaine, tu cours avant 7:30'$$,
  'the athlete confirms an observed fact'
);
select throws_ok(
  $$update public.athlete_facts set confirmed_at = now() where text = 'Un objectif écrit par toi'$$,
  '23514', null, 'only an observed fact can be confirmed'
);
select lives_ok(
  $$update public.athlete_facts
    set origin = 'said', basis = null, confirmed_at = null, text = 'En semaine, tu cours avant 8:00'
    where category = 'habit'$$,
  'a correction turns an observation into what the athlete said'
);

select pg_temp.act_as('d9100000-0000-4000-8000-0000000000d9');
select is(
  (select count(*)::int from public.athlete_facts), 0,
  'another athlete sees none of these facts'
);

select * from finish();
rollback;
