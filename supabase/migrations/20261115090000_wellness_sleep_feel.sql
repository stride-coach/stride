alter table public.athlete_wellness_checkins
  add column sleep_feel text check (sleep_feel in ('good', 'average', 'poor'));

grant insert (sleep_feel) on public.athlete_wellness_checkins to authenticated;
grant update (sleep_feel) on public.athlete_wellness_checkins to authenticated;
