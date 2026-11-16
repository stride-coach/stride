create table public.coach_message_corrections (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  coach_session_id uuid not null references public.coach_sessions (id) on delete cascade,
  coach_thread_item_id bigint not null references public.coach_thread_items (id) on delete cascade,
  excerpt text not null check (char_length(excerpt) between 1 and 160),
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index coach_message_corrections_pending
  on public.coach_message_corrections (coach_session_id, id)
  where delivered_at is null;
create index coach_message_corrections_user on public.coach_message_corrections (user_id);
create index coach_message_corrections_item on public.coach_message_corrections (coach_thread_item_id);

alter table public.coach_message_corrections enable row level security;

create policy coach_message_corrections_owner_select on public.coach_message_corrections
  for select to authenticated using ((select auth.uid()) = user_id);
create policy coach_message_corrections_owner_insert on public.coach_message_corrections
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.coach_thread_items
      where coach_thread_items.id = coach_thread_item_id
        and coach_thread_items.coach_session_id = coach_message_corrections.coach_session_id
        and coach_thread_items.user_id = (select auth.uid())
    )
  );
create policy coach_message_corrections_owner_update on public.coach_message_corrections
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.coach_message_corrections from anon, authenticated;
grant select on public.coach_message_corrections to authenticated;
grant insert (user_id, coach_session_id, coach_thread_item_id, excerpt, text)
  on public.coach_message_corrections to authenticated;
grant update (delivered_at) on public.coach_message_corrections to authenticated;
