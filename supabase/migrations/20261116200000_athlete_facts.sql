create table public.athlete_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (category in ('goal', 'body', 'habit', 'upcoming')),
  text text not null check (char_length(text) between 1 and 300),
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (category = 'upcoming' or (starts_on is null and ends_on is null)),
  check (starts_on is null or ends_on is null or ends_on >= starts_on)
);

create index athlete_facts_user_created on public.athlete_facts (user_id, created_at);

create function private.touch_athlete_fact()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.category, new.text, new.starts_on, new.ends_on)
    is distinct from (old.category, old.text, old.starts_on, old.ends_on) then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

create trigger athlete_facts_touch before update on public.athlete_facts
  for each row execute function private.touch_athlete_fact();

create function private.limit_athlete_facts()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 428));
  if (select count(*) from public.athlete_facts where user_id = new.user_id) >= 100 then
    raise exception 'athlete_facts_limit' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger athlete_facts_limit before insert on public.athlete_facts
  for each row execute function private.limit_athlete_facts();

alter table public.athlete_facts enable row level security;

create policy athlete_facts_owner_select on public.athlete_facts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy athlete_facts_owner_insert on public.athlete_facts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy athlete_facts_owner_update on public.athlete_facts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy athlete_facts_owner_delete on public.athlete_facts
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.athlete_facts from anon, authenticated;
grant select, delete on public.athlete_facts to authenticated;
grant insert (user_id, category, text, starts_on, ends_on) on public.athlete_facts to authenticated;
grant update (category, text, starts_on, ends_on) on public.athlete_facts to authenticated;
