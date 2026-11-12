create table public.fueling_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tested_on date not null,
  activity_id uuid,
  carbs_per_hour_g integer not null check (carbs_per_hour_g between 10 and 150),
  duration_seconds integer not null check (duration_seconds between 1800 and 172800),
  tolerance text not null check (tolerance in ('good', 'discomfort', 'not_tolerated')),
  note text check (note is null or char_length(btrim(note)) between 1 and 200),
  created_at timestamptz not null default now()
);

create index fueling_tests_user_tested_idx
  on public.fueling_tests (user_id, tested_on desc);

alter table public.fueling_tests enable row level security;

create policy fueling_tests_owner_select on public.fueling_tests
  for select to authenticated using ((select auth.uid()) = user_id);
create policy fueling_tests_owner_insert on public.fueling_tests
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy fueling_tests_owner_delete on public.fueling_tests
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.fueling_tests from anon, authenticated;
grant select, delete on public.fueling_tests to authenticated;
grant insert (
  user_id, tested_on, activity_id, carbs_per_hour_g, duration_seconds, tolerance, note
) on public.fueling_tests to authenticated;
