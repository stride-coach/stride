alter table public.coach_sessions
  add column kind text not null default 'topic' check (kind in ('main', 'topic')),
  add column race_id uuid references public.athlete_races (id) on delete set null,
  add column closed_at timestamptz,
  add constraint coach_sessions_main_open check (kind = 'topic' or closed_at is null);

update public.coach_sessions set closed_at = last_activity_at;

create index coach_sessions_user_kind_activity
  on public.coach_sessions (user_id, kind, last_activity_at desc);

create function private.keep_coach_topic_closed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.closed_at is not null and new.closed_at is distinct from old.closed_at then
    raise exception 'A closed topic cannot be reopened' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger coach_sessions_keep_closed before update of closed_at on public.coach_sessions
  for each row execute function private.keep_coach_topic_closed();

create policy coach_sessions_owner_race on public.coach_sessions
  as restrictive
  for insert to authenticated
  with check (
    race_id is null
    or exists (
      select 1 from public.athlete_races
      where athlete_races.id = race_id and athlete_races.user_id = (select auth.uid())
    )
  );

grant insert (kind, race_id) on public.coach_sessions to authenticated;
grant update (title, closed_at) on public.coach_sessions to authenticated;

alter table public.coach_thread_items drop constraint coach_thread_items_kind_check;
alter table public.coach_thread_items add constraint coach_thread_items_kind_check check (
  kind in (
    'athlete', 'answer', 'coach', 'consult_request', 'consult_reply', 'consult_note',
    'consult_end', 'read', 'question', 'proposal', 'error', 'staff_message', 'topic_summary'
  )
);
