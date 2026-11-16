create table public.coach_attachment_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  file_name text not null check (char_length(file_name) between 1 and 120),
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp', 'application/gpx+xml')),
  size_bytes integer not null check (size_bytes between 1 and 10485760),
  summary jsonb not null,
  created_at timestamptz not null default now(),
  constraint coach_attachment_files_path_owner check (split_part(storage_path, '/', 1) = user_id::text)
);

create index coach_attachment_files_user_id_idx on public.coach_attachment_files (user_id, created_at desc);

alter table public.coach_attachment_files enable row level security;

create policy coach_attachment_files_owner_select on public.coach_attachment_files
  for select to authenticated using ((select auth.uid()) = user_id);
create policy coach_attachment_files_owner_insert on public.coach_attachment_files
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy coach_attachment_files_owner_delete on public.coach_attachment_files
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.coach_attachment_files from anon, authenticated;
grant select, delete on public.coach_attachment_files to authenticated;
grant insert (user_id, storage_path, file_name, content_type, size_bytes, summary)
  on public.coach_attachment_files to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('coach-files', 'coach-files', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/gpx+xml']);

create policy coach_files_owner_select on storage.objects for select to authenticated
using (bucket_id = 'coach-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy coach_files_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'coach-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy coach_files_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'coach-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
