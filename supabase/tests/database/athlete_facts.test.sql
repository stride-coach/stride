begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, aud, role, email) values
  ('c9000000-0000-4000-8000-0000000000c9', 'authenticated', 'authenticated', 'facts-a@example.com'),
  ('d9000000-0000-4000-8000-0000000000d9', 'authenticated', 'authenticated', 'facts-b@example.com');

create function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select ok(rowsecurity, 'athlete facts have RLS enabled')
from pg_tables
where schemaname = 'public' and tablename = 'athlete_facts';

set local role anon;
select throws_ok(
  'select * from public.athlete_facts', '42501', null,
  'anonymous user cannot read facts'
);
reset role;

select pg_temp.act_as('c9000000-0000-4000-8000-0000000000c9');
select lives_ok(
  $$insert into public.athlete_facts (user_id, category, text)
    values ('c9000000-0000-4000-8000-0000000000c9', 'habit', 'Sortie longue le dimanche')$$,
  'athlete records a fact about themself'
);
select lives_ok(
  $$insert into public.athlete_facts (user_id, category, text, starts_on, ends_on)
    values ('c9000000-0000-4000-8000-0000000000c9', 'upcoming', 'Semaine de ski', '2027-02-14', '2027-02-21')$$,
  'an upcoming fact carries a period'
);
select throws_ok(
  $$insert into public.athlete_facts (user_id, category, text, starts_on)
    values ('c9000000-0000-4000-8000-0000000000c9', 'body', 'Tendon sensible', '2027-02-14')$$,
  '23514', null, 'only an upcoming fact carries dates'
);
select throws_ok(
  $$insert into public.athlete_facts (user_id, category, text, starts_on, ends_on)
    values ('c9000000-0000-4000-8000-0000000000c9', 'upcoming', 'Déplacement', '2027-02-21', '2027-02-14')$$,
  '23514', null, 'a period cannot end before it starts'
);
select throws_ok(
  $$insert into public.athlete_facts (user_id, category, text)
    values ('c9000000-0000-4000-8000-0000000000c9', 'goal', '')$$,
  '23514', null, 'a fact cannot be empty'
);
reset role;
update public.athlete_facts set created_at = created_at - interval '1 day' where category = 'habit';
select pg_temp.act_as('c9000000-0000-4000-8000-0000000000c9');
select lives_ok(
  $$update public.athlete_facts set text = 'Sortie longue le samedi' where category = 'habit'$$,
  'athlete corrects a fact'
);
select isnt(
  (select updated_at from public.athlete_facts where category = 'habit'),
  (select created_at from public.athlete_facts where category = 'habit'),
  'a correction moves the update date'
);

select pg_temp.act_as('d9000000-0000-4000-8000-0000000000d9');
select is(
  (select count(*)::int from public.athlete_facts), 0,
  'another athlete sees no facts'
);
select throws_ok(
  $$insert into public.athlete_facts (user_id, category, text)
    values ('c9000000-0000-4000-8000-0000000000c9', 'goal', 'Usurpé')$$,
  '42501', null, 'another athlete cannot write facts as the owner'
);

select pg_temp.act_as('c9000000-0000-4000-8000-0000000000c9');
delete from public.athlete_facts;
select is(
  (select count(*)::int from public.athlete_facts), 0,
  'athlete forgets every fact'
);
reset role;

select * from finish();
rollback;
