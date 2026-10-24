create function public.race_strategy_valid(p_consignes jsonb, p_segments jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_consignes) = 'array'
    and jsonb_array_length(p_consignes) <= 6
    and not exists (
      select 1 from jsonb_array_elements(p_consignes) as item (value)
      where jsonb_typeof(item.value) <> 'string'
        or char_length(btrim(item.value #>> '{}')) not between 1 and 240
    )
    and jsonb_typeof(p_segments) = 'object'
    and (select count(*) from jsonb_object_keys(p_segments)) <= 80
    and not exists (
      select 1 from jsonb_each(p_segments) as segment (key, value)
      where segment.key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or jsonb_typeof(segment.value) <> 'object'
        or exists (
          select 1 from jsonb_object_keys(segment.value) as field (name)
          where field.name not in ('note', 'paceFactor')
        )
        or (
          segment.value ? 'note'
          and (
            jsonb_typeof(segment.value -> 'note') <> 'string'
            or char_length(btrim(segment.value ->> 'note')) not between 1 and 240
          )
        )
        or (
          segment.value ? 'paceFactor'
          and (
            jsonb_typeof(segment.value -> 'paceFactor') <> 'number'
            or (segment.value ->> 'paceFactor')::numeric not between 0.8 and 1.2
          )
        )
    );
$$;

create function public.race_drop_bag_extras_valid(p_extras text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select not exists (
    select 1 from unnest(p_extras) as extra (value)
    where char_length(btrim(extra.value)) not between 1 and 80
  );
$$;

create function public.race_nutrition_payload_valid(p_payload jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  with targets as (
    select coalesce(p_payload -> 'targets', '{}') as value
  ),
  ranges (name, low, high) as (
    values
      ('carbsPerHourG', 20, 120),
      ('waterMlPerHour', 100, 1500),
      ('sodiumMgPerHour', 0, 2000),
      ('caffeineMaxMg', 0, 600),
      ('flaskMl', 100, 1500),
      ('flaskCount', 0, 6),
      ('bladderMl', 250, 3000)
  )
  select jsonb_typeof(p_payload) = 'object'
    and (p_payload ? 'plan' or p_payload ? 'targets')
    and not exists (
      select 1 from jsonb_object_keys(p_payload) as field (name)
      where field.name not in ('plan', 'targets')
    )
    and (not p_payload ? 'plan' or jsonb_typeof(p_payload -> 'plan') = 'object')
    and jsonb_typeof((select value from targets)) = 'object'
    and not exists (
      select 1 from jsonb_each((select value from targets)) as target (name, value)
      where not (
        (
          target.name = 'nightCaffeine'
          and jsonb_typeof(target.value) = 'boolean'
        )
        or (
          target.name = 'bladderMl' and jsonb_typeof(target.value) = 'null'
        )
        or exists (
          select 1 from ranges
          where ranges.name = target.name
            and jsonb_typeof(target.value) = 'number'
            and (target.value #>> '{}')::numeric
              = trunc((target.value #>> '{}')::numeric)
            and (target.value #>> '{}')::numeric between ranges.low and ranges.high
        )
      )
    );
$$;

create table public.race_strategies (
  race_id uuid primary key references public.athlete_races (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  consignes jsonb not null default '[]',
  segments jsonb not null default '{}',
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint race_strategies_content_check check (public.race_strategy_valid(consignes, segments))
);

create table public.athlete_nutrition_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  catalogue_key text check (catalogue_key ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  brand text check (char_length(btrim(brand)) between 1 and 60),
  kind text not null check (kind in ('gel', 'drink', 'compote', 'solid', 'other')),
  carbs_g integer not null check (carbs_g between 0 and 200),
  sodium_mg integer not null default 0 check (sodium_mg between 0 and 3000),
  caffeine_mg integer not null default 0 check (caffeine_mg between 0 and 400),
  serving_label text check (char_length(btrim(serving_label)) between 1 and 60),
  serving_ml integer check (serving_ml between 1 and 2000),
  tested boolean not null default false,
  tested_note text check (char_length(tested_note) <= 240),
  archived_at timestamptz,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint athlete_nutrition_products_catalogue_key unique (user_id, catalogue_key)
);

create index athlete_nutrition_products_user_id_idx
  on public.athlete_nutrition_products (user_id, archived_at);

create table public.race_nutrition_plans (
  race_id uuid primary key references public.athlete_races (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  plan jsonb not null default '{}' check (jsonb_typeof(plan) = 'object'),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.race_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  race_id uuid not null references public.athlete_races (id) on delete cascade,
  kind text not null check (kind in ('strategy', 'nutrition')),
  base_revision integer not null default 0 check (base_revision >= 0),
  base_plan_revision integer check (base_plan_revision >= 0),
  waypoint_signature text check (char_length(waypoint_signature) = 32),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  summary text check (char_length(summary) <= 2000),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  status text not null default 'ready'
    check (status in ('ready', 'accepted', 'rejected', 'superseded', 'stale')),
  coach_session_id uuid references public.coach_sessions (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.race_drop_bags (
  race_id uuid primary key references public.athlete_races (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  extras text[] not null default '{}' check (
    cardinality(extras) <= 20
    and array_position(extras, null) is null
    and public.race_drop_bag_extras_valid(extras)
  ),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index race_proposals_one_ready_idx
  on public.race_proposals (race_id, kind) where status = 'ready';
create index race_proposals_user_race_idx
  on public.race_proposals (user_id, race_id, created_at desc);
create index race_proposals_coach_session_id_idx
  on public.race_proposals (coach_session_id);
create index race_strategies_user_id_idx on public.race_strategies (user_id);
create index race_nutrition_plans_user_id_idx on public.race_nutrition_plans (user_id);

alter table public.race_plans
  add column flask_ml integer not null default 500 check (flask_ml between 100 and 1500),
  add column flask_count integer not null default 2 check (flask_count between 0 and 6),
  add column bladder_ml integer check (bladder_ml between 250 and 3000),
  add column caffeine_max_mg integer not null default 200 check (caffeine_max_mg between 0 and 600);

create trigger race_strategies_revision before update on public.race_strategies
  for each row execute function public.advance_revision();
create trigger athlete_nutrition_products_revision before update on public.athlete_nutrition_products
  for each row execute function public.advance_revision();
create trigger race_nutrition_plans_revision before update on public.race_nutrition_plans
  for each row execute function public.advance_revision();

alter table public.race_strategies enable row level security;
alter table public.athlete_nutrition_products enable row level security;
alter table public.race_nutrition_plans enable row level security;
alter table public.race_proposals enable row level security;
alter table public.race_drop_bags enable row level security;

create trigger race_drop_bags_revision before update on public.race_drop_bags
  for each row execute function public.advance_revision();
create index race_drop_bags_user_id_idx on public.race_drop_bags (user_id);

create policy race_drop_bags_owner_select on public.race_drop_bags
  for select to authenticated using ((select auth.uid()) = user_id);
create policy race_drop_bags_owner_insert on public.race_drop_bags
  for insert to authenticated
  with check ((select auth.uid()) = user_id and public.race_owned(race_id));
create policy race_drop_bags_owner_update on public.race_drop_bags
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and public.race_owned(race_id));
create policy race_drop_bags_owner_delete on public.race_drop_bags
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy race_strategies_owner_select on public.race_strategies
  for select to authenticated using ((select auth.uid()) = user_id);
create policy race_strategies_owner_insert on public.race_strategies
  for insert to authenticated
  with check ((select auth.uid()) = user_id and public.race_owned(race_id));
create policy race_strategies_owner_update on public.race_strategies
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and public.race_owned(race_id));
create policy race_strategies_owner_delete on public.race_strategies
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy athlete_nutrition_products_owner_select on public.athlete_nutrition_products
  for select to authenticated using ((select auth.uid()) = user_id);
create policy athlete_nutrition_products_owner_insert on public.athlete_nutrition_products
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy athlete_nutrition_products_owner_update on public.athlete_nutrition_products
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy athlete_nutrition_products_owner_delete on public.athlete_nutrition_products
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy race_nutrition_plans_owner_select on public.race_nutrition_plans
  for select to authenticated using ((select auth.uid()) = user_id);
create policy race_nutrition_plans_owner_insert on public.race_nutrition_plans
  for insert to authenticated
  with check ((select auth.uid()) = user_id and public.race_owned(race_id));
create policy race_nutrition_plans_owner_update on public.race_nutrition_plans
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and public.race_owned(race_id));
create policy race_nutrition_plans_owner_delete on public.race_nutrition_plans
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy race_proposals_owner_select on public.race_proposals
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.race_strategies, public.athlete_nutrition_products,
  public.race_nutrition_plans, public.race_proposals
  from anon, authenticated;
revoke all on function public.race_strategy_valid(jsonb, jsonb) from public, anon;
grant execute on function public.race_strategy_valid(jsonb, jsonb) to authenticated;
revoke all on public.race_drop_bags from anon, authenticated;
revoke all on function public.race_drop_bag_extras_valid(text[]) from public, anon;
grant execute on function public.race_drop_bag_extras_valid(text[]) to authenticated;
revoke all on function public.race_nutrition_payload_valid(jsonb) from public, anon;
grant execute on function public.race_nutrition_payload_valid(jsonb) to authenticated;
grant select on public.race_drop_bags to authenticated;
grant insert (race_id, user_id, extras) on public.race_drop_bags to authenticated;
grant update (extras) on public.race_drop_bags to authenticated;
grant delete on public.race_drop_bags to authenticated;

grant select on public.race_strategies, public.athlete_nutrition_products,
  public.race_nutrition_plans, public.race_proposals
  to authenticated;
grant insert (race_id, user_id, consignes, segments) on public.race_strategies to authenticated;
grant update (consignes, segments) on public.race_strategies to authenticated;
grant delete on public.race_strategies to authenticated;
grant insert (
  id, user_id, catalogue_key, name, brand, kind, carbs_g, sodium_mg, caffeine_mg,
  serving_label, serving_ml, tested, tested_note, archived_at
) on public.athlete_nutrition_products to authenticated;
grant update (
  name, brand, kind, carbs_g, sodium_mg, caffeine_mg, serving_label, serving_ml,
  tested, tested_note, archived_at
) on public.athlete_nutrition_products to authenticated;
grant delete on public.athlete_nutrition_products to authenticated;
grant insert (race_id, user_id, plan) on public.race_nutrition_plans to authenticated;
grant update (plan) on public.race_nutrition_plans to authenticated;
grant delete on public.race_nutrition_plans to authenticated;
grant insert (flask_ml, flask_count, bladder_ml, caffeine_max_mg)
  on public.race_plans to authenticated;
grant update (flask_ml, flask_count, bladder_ml, caffeine_max_mg)
  on public.race_plans to authenticated;


create function private.race_waypoint_signature(p_race_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select md5(coalesce(
    string_agg(id::text || ':' || distance_m::text, ',' order by distance_m, id),
    ''
  ))
  from public.race_waypoints
  where race_id = p_race_id;
$$;

create function private.race_proposal_keyed(p_kind text, p_payload jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_kind
    when 'strategy' then
      coalesce(p_payload -> 'segments', '{}') <> '{}'::jsonb
    else
      coalesce(p_payload #> '{plan,segments}', '{}') <> '{}'::jsonb
  end;
$$;

create function private.race_proposal_tracks_plan(p_kind text, p_payload jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_kind = 'strategy' or p_payload ? 'plan';
$$;

create function private.race_proposal_base(p_race_id uuid, p_kind text)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(
    case p_kind
      when 'strategy' then
        (select revision from public.race_strategies where race_id = p_race_id)
      else
        (select revision from public.race_nutrition_plans where race_id = p_race_id)
    end,
    0
  );
$$;

create function private.race_plan_revision(p_race_id uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select revision from public.race_plans where race_id = p_race_id), 0
  );
$$;

create function public.submit_race_proposal(
  p_race_id uuid,
  p_kind text,
  p_title text,
  p_payload jsonb,
  p_summary text default null,
  p_coach_session_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = 'PT401';
  end if;
  if not exists (
    select 1 from public.athlete_races where id = p_race_id and user_id = v_user_id
  ) then
    raise exception 'not_found' using errcode = 'PT404';
  end if;
  if p_kind is null or p_kind not in ('strategy', 'nutrition')
    or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'invalid_proposal' using errcode = 'PT400';
  end if;
  if p_kind = 'strategy' and not coalesce(public.race_strategy_valid(
    coalesce(p_payload -> 'consignes', '[]'),
    coalesce(p_payload -> 'segments', '{}')
  ), false) then
    raise exception 'invalid_proposal' using errcode = 'PT400';
  end if;
  if p_kind = 'nutrition'
    and not coalesce(public.race_nutrition_payload_valid(p_payload), false) then
    raise exception 'invalid_proposal' using errcode = 'PT400';
  end if;
  if p_coach_session_id is not null and not exists (
    select 1 from public.coach_sessions
    where id = p_coach_session_id and user_id = v_user_id
  ) then
    raise exception 'invalid_coach_session' using errcode = 'PT400';
  end if;

  update public.race_proposals
  set status = 'superseded', decided_at = now(), updated_at = now()
  where race_id = p_race_id and kind = p_kind and user_id = v_user_id and status = 'ready';

  insert into public.race_proposals (
    user_id, race_id, kind, base_revision, base_plan_revision, waypoint_signature,
    title, summary, payload, coach_session_id
  ) values (
    v_user_id, p_race_id, p_kind,
    private.race_proposal_base(p_race_id, p_kind),
    case when p_kind = 'nutrition' and p_payload ? 'targets'
      then private.race_plan_revision(p_race_id) end,
    case when private.race_proposal_keyed(p_kind, p_payload)
      then private.race_waypoint_signature(p_race_id) end,
    p_title, p_summary, p_payload, p_coach_session_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

create function public.accept_race_proposal(p_proposal_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_proposal public.race_proposals;
  v_targets jsonb;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = 'PT401';
  end if;
  select * into v_proposal from public.race_proposals
  where id = p_proposal_id and user_id = v_user_id
  for update;
  if not found then
    raise exception 'not_found' using errcode = 'PT404';
  end if;
  if v_proposal.status <> 'ready' then
    raise exception 'not_ready' using errcode = 'PT409';
  end if;

  if (
    private.race_proposal_tracks_plan(v_proposal.kind, v_proposal.payload)
    and private.race_proposal_base(v_proposal.race_id, v_proposal.kind)
      <> v_proposal.base_revision
  ) or (
    v_proposal.base_plan_revision is not null
    and private.race_plan_revision(v_proposal.race_id)
      <> v_proposal.base_plan_revision
  ) or (
    v_proposal.waypoint_signature is not null
    and private.race_waypoint_signature(v_proposal.race_id)
      <> v_proposal.waypoint_signature
  ) then
    update public.race_proposals
    set status = 'stale', decided_at = now(), updated_at = now()
    where id = v_proposal.id;
    return 'stale';
  end if;

  if v_proposal.kind = 'strategy' then
    insert into public.race_strategies (race_id, user_id, consignes, segments)
    values (
      v_proposal.race_id, v_user_id,
      coalesce(v_proposal.payload -> 'consignes', '[]'),
      coalesce(v_proposal.payload -> 'segments', '{}')
    )
    on conflict (race_id) do update
      set consignes = excluded.consignes, segments = excluded.segments;
  else
    if v_proposal.payload ? 'plan' then
      insert into public.race_nutrition_plans (race_id, user_id, plan)
      values (v_proposal.race_id, v_user_id, v_proposal.payload -> 'plan')
      on conflict (race_id) do update set plan = excluded.plan;
    end if;
    v_targets := v_proposal.payload -> 'targets';
    if v_targets is not null then
      insert into public.race_plans (race_id, user_id)
      values (v_proposal.race_id, v_user_id)
      on conflict (race_id) do nothing;
      update public.race_plans set
        carbs_per_hour_g = coalesce((v_targets ->> 'carbsPerHourG')::integer, carbs_per_hour_g),
        water_ml_per_hour = coalesce((v_targets ->> 'waterMlPerHour')::integer, water_ml_per_hour),
        sodium_mg_per_hour = coalesce((v_targets ->> 'sodiumMgPerHour')::integer, sodium_mg_per_hour),
        caffeine_max_mg = coalesce((v_targets ->> 'caffeineMaxMg')::integer, caffeine_max_mg),
        night_caffeine = coalesce((v_targets ->> 'nightCaffeine')::boolean, night_caffeine),
        flask_ml = coalesce((v_targets ->> 'flaskMl')::integer, flask_ml),
        flask_count = coalesce((v_targets ->> 'flaskCount')::integer, flask_count),
        bladder_ml = case
          when v_targets ? 'bladderMl' then (v_targets ->> 'bladderMl')::integer
          else bladder_ml
        end
      where race_id = v_proposal.race_id and user_id = v_user_id;
    end if;
  end if;

  update public.race_proposals
  set status = 'accepted', decided_at = now(), updated_at = now()
  where id = v_proposal.id;
  return 'accepted';
end;
$$;

create function public.reject_race_proposal(p_proposal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'PT401';
  end if;
  select status into v_status from public.race_proposals
  where id = p_proposal_id and user_id = auth.uid()
  for update;
  if not found then
    raise exception 'not_found' using errcode = 'PT404';
  end if;
  if v_status <> 'ready' then
    raise exception 'not_ready' using errcode = 'PT409';
  end if;
  update public.race_proposals
  set status = 'rejected', decided_at = now(), updated_at = now()
  where id = p_proposal_id;
end;
$$;

revoke all on function private.race_waypoint_signature(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.race_proposal_keyed(text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function private.race_proposal_tracks_plan(text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function private.race_proposal_base(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function private.race_plan_revision(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.submit_race_proposal(uuid, text, text, jsonb, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.accept_race_proposal(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.reject_race_proposal(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_race_proposal(uuid, text, text, jsonb, text, uuid)
  to authenticated;
grant execute on function public.accept_race_proposal(uuid) to authenticated;
grant execute on function public.reject_race_proposal(uuid) to authenticated;
