begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, aud, role, email) values
  ('a7000000-0000-4000-8000-0000000000a7', 'authenticated', 'authenticated', 'files-a@example.com'),
  ('b7000000-0000-4000-8000-0000000000b7', 'authenticated', 'authenticated', 'files-b@example.com');

create function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
$$;

select pg_temp.act_as('a7000000-0000-4000-8000-0000000000a7');
select lives_ok(
  $$insert into public.coach_attachment_files (user_id, storage_path, file_name, content_type, size_bytes, summary)
    values ('a7000000-0000-4000-8000-0000000000a7',
      'a7000000-0000-4000-8000-0000000000a7/one.gpx', 'sortie.gpx', 'application/gpx+xml', 1200, '{}')$$,
  'athlete records an uploaded file'
);
select throws_ok(
  $$insert into public.coach_attachment_files (user_id, storage_path, file_name, content_type, size_bytes, summary)
    values ('b7000000-0000-4000-8000-0000000000b7',
      'b7000000-0000-4000-8000-0000000000b7/two.gpx', 'autre.gpx', 'application/gpx+xml', 1200, '{}')$$,
  '42501', null, 'athlete cannot record a file for another athlete'
);
select throws_ok(
  $$insert into public.coach_attachment_files (user_id, storage_path, file_name, content_type, size_bytes, summary)
    values ('a7000000-0000-4000-8000-0000000000a7',
      'b7000000-0000-4000-8000-0000000000b7/three.gpx', 'volé.gpx', 'application/gpx+xml', 1200, '{}')$$,
  '23514', null, 'a file path must sit in the athlete folder'
);
select throws_ok(
  $$insert into public.coach_attachment_files (user_id, storage_path, file_name, content_type, size_bytes, summary)
    values ('a7000000-0000-4000-8000-0000000000a7',
      'a7000000-0000-4000-8000-0000000000a7/four.exe', 'x.exe', 'application/x-msdownload', 1200, '{}')$$,
  '23514', null, 'an unsupported content type is refused'
);
select is((select count(*)::int from public.coach_attachment_files), 1, 'athlete reads their own file');

select pg_temp.act_as('b7000000-0000-4000-8000-0000000000b7');
select is((select count(*)::int from public.coach_attachment_files), 0, 'another athlete reads nothing');
select is(
  (select count(*)::int from storage.buckets where id = 'coach-files' and not public),
  1,
  'the files bucket is private'
);

select * from finish();
rollback;
