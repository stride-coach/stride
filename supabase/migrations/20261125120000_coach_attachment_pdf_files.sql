alter table public.coach_attachment_files
  add column model_file_id text check (model_file_id is null or char_length(model_file_id) between 1 and 128);

alter table public.coach_attachment_files
  drop constraint coach_attachment_files_content_type_check,
  add constraint coach_attachment_files_content_type_check
    check (content_type in ('image/jpeg', 'image/png', 'image/webp', 'application/gpx+xml', 'application/pdf'));

alter table public.coach_attachment_files
  drop constraint coach_attachment_files_size_bytes_check,
  add constraint coach_attachment_files_size_bytes_check
    check (
      size_bytes between 1 and case when content_type = 'application/pdf' then 31457280 else 10485760 end
    );

grant insert (model_file_id) on public.coach_attachment_files to authenticated;

update storage.buckets
set file_size_limit = 31457280,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/gpx+xml', 'application/pdf']
where id = 'coach-files';
