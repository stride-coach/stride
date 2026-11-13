create table public.race_weather_snapshots (
  race_id uuid not null references public.athlete_races (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  observed_on date not null,
  weather jsonb not null check (jsonb_typeof(weather) = 'object'),
  adopted boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (race_id, observed_on)
);

create index race_weather_snapshots_user_id_idx on public.race_weather_snapshots (user_id);

alter table public.race_weather_snapshots enable row level security;

create policy race_weather_snapshots_owner_select on public.race_weather_snapshots
  for select to authenticated using ((select auth.uid()) = user_id);
create policy race_weather_snapshots_owner_insert on public.race_weather_snapshots
  for insert to authenticated
  with check ((select auth.uid()) = user_id and public.race_owned(race_id));
create policy race_weather_snapshots_owner_update on public.race_weather_snapshots
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.race_weather_snapshots from anon, authenticated;
grant select on public.race_weather_snapshots to authenticated;
grant insert (race_id, user_id, observed_on, weather) on public.race_weather_snapshots to authenticated;
grant update (adopted) on public.race_weather_snapshots to authenticated;
