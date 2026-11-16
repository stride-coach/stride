alter table public.coach_sessions
  add column read_through_item_id bigint check (read_through_item_id is null or read_through_item_id > 0);

grant update (read_through_item_id) on public.coach_sessions to authenticated;
