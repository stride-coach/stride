begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, aud, role, email)
values
  ('a0000000-0000-4000-8000-0000000000a7', 'authenticated', 'authenticated', 'link-a@example.com'),
  ('b0000000-0000-4000-8000-0000000000b7', 'authenticated', 'authenticated', 'link-b@example.com');

create function pg_temp.act_as(p_user uuid)
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.act_as('b0000000-0000-4000-8000-0000000000b7');
insert into public.athlete_races (id, user_id, name, race_date)
values ('b1000000-0000-4000-8000-0000000000b7', 'b0000000-0000-4000-8000-0000000000b7', 'Bea race', current_date);
reset role;

select pg_temp.act_as('a0000000-0000-4000-8000-0000000000a7');
insert into public.athlete_races (id, user_id, name, race_date, race_kind, target_duration_seconds)
values ('a1000000-0000-4000-8000-0000000000a7', 'a0000000-0000-4000-8000-0000000000a7', 'Ana trail', current_date, 'trail', 21600);
insert into public.race_waypoints (race_id, user_id, kind, name, distance_m, crew_access, todo, nutrition_note)
values ('a1000000-0000-4000-8000-0000000000a7', 'a0000000-0000-4000-8000-0000000000a7', 'aid', 'Chaville', 47000,
  'Gare de Chaville', 'Note privée', 'Gel privé');

select lives_ok(
  $$insert into public.race_crew_links (race_id, user_id, token)
    values ('a1000000-0000-4000-8000-0000000000a7', 'a0000000-0000-4000-8000-0000000000a7',
      'AnaSecretToken_0123456789abcdefghij')$$,
  'athlete creates a tracking link for their race'
);

select throws_ok(
  $$insert into public.race_crew_links (race_id, user_id, token)
    values ('b1000000-0000-4000-8000-0000000000b7', 'a0000000-0000-4000-8000-0000000000a7',
      'BeaStolenToken_0123456789abcdefghij')$$,
  '42501', null, 'athlete cannot create a link for another athlete''s race'
);

select throws_ok(
  $$update public.race_crew_links set token = 'short'
    where race_id = 'a1000000-0000-4000-8000-0000000000a7'$$,
  '23514', null, 'a token is long and url-safe'
);
reset role;

set local role anon;
select throws_ok(
  'select * from public.race_crew_links', '42501', null, 'anon cannot list links'
);

select is(
  public.crew_link_view('AnaSecretToken_0123456789abcdefghij') -> 'race' ->> 'name',
  'Ana trail',
  'anyone with the token reads the race around race day'
);

select is(
  public.crew_link_view('AnaSecretToken_0123456789abcdefghij') -> 'waypoints' -> 0 ->> 'crew_access',
  'Gare de Chaville',
  'the crew sees the access to each point'
);

select ok(
  not (public.crew_link_view('AnaSecretToken_0123456789abcdefghij') -> 'waypoints' -> 0 ? 'todo')
    and not (public.crew_link_view('AnaSecretToken_0123456789abcdefghij') -> 'waypoints' -> 0 ? 'nutrition_note'),
  'private notes never leave through the link'
);

select is(
  public.crew_link_view('WrongToken_0123456789abcdefghijklmn'),
  null,
  'an unknown token reads nothing'
);
reset role;

update public.race_crew_links set enabled = false
where race_id = 'a1000000-0000-4000-8000-0000000000a7';
select is(
  public.crew_link_view('AnaSecretToken_0123456789abcdefghij'),
  null,
  'a disabled link reads nothing'
);

update public.race_crew_links set enabled = true
where race_id = 'a1000000-0000-4000-8000-0000000000a7';
update public.athlete_races set race_date = current_date + 10
where id = 'a1000000-0000-4000-8000-0000000000a7';
select is(
  public.crew_link_view('AnaSecretToken_0123456789abcdefghij'),
  null,
  'a link reads nothing outside the days around the race'
);

select * from finish();
rollback;
