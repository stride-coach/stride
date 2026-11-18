alter table public.athlete_facts
  add column origin text not null default 'said' check (origin in ('said', 'observed')),
  add column basis text check (basis is null or char_length(basis) between 1 and 60),
  add column confirmed_at timestamptz,
  add constraint athlete_facts_observed_basis check ((origin = 'observed') = (basis is not null)),
  add constraint athlete_facts_confirmed_observed check (confirmed_at is null or origin = 'observed');

create or replace function private.touch_athlete_fact()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.category, new.text, new.starts_on, new.ends_on, new.origin)
    is distinct from (old.category, old.text, old.starts_on, old.ends_on, old.origin) then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

grant insert (origin, basis) on public.athlete_facts to authenticated;
grant update (origin, basis, confirmed_at) on public.athlete_facts to authenticated;
