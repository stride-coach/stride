alter table public.coach_thread_items drop constraint coach_thread_items_kind_check;
alter table public.coach_thread_items add constraint coach_thread_items_kind_check check (
  kind in (
    'athlete', 'answer', 'coach', 'consult_request', 'consult_reply', 'consult_note',
    'consult_end', 'read', 'question', 'proposal', 'error', 'staff_message'
  )
);
