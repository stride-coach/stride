create table public.race_lessons (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references public.athlete_races (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('keep', 'change')),
  body text not null check (char_length(btrim(body)) between 1 and 200),
  position integer not null default 0 check (position between 0 and 99),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index race_lessons_race_idx on public.race_lessons (race_id, position);
create index race_lessons_user_id_idx on public.race_lessons (user_id);

create trigger race_lessons_revision before update on public.race_lessons
  for each row execute function public.advance_revision();

alter table public.race_lessons enable row level security;

create policy race_lessons_owner_select on public.race_lessons
  for select to authenticated using ((select auth.uid()) = user_id);
create policy race_lessons_owner_insert on public.race_lessons
  for insert to authenticated
  with check ((select auth.uid()) = user_id and public.race_owned(race_id));
create policy race_lessons_owner_delete on public.race_lessons
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.race_lessons from anon, authenticated;
grant select, delete on public.race_lessons to authenticated;
grant insert (race_id, user_id, kind, body, position) on public.race_lessons to authenticated;
