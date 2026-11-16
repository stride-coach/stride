create function public.revert_plan_proposal(p_proposal_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_proposal public.plan_proposals;
  v_plan public.training_plans;
  v_base public.plan_versions;
  v_applied integer;
  v_version integer;
  v_today date;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = 'PT401';
  end if;

  select * into v_proposal from public.plan_proposals
    where id = p_proposal_id and user_id = v_user_id for update;
  if not found then
    raise exception 'not_found' using errcode = 'PT404';
  end if;
  if v_proposal.status <> 'applied' or v_proposal.scope <> 'session'
    or v_proposal.applied_version is null then
    raise exception 'invalid_state' using errcode = 'PT409';
  end if;
  v_applied := v_proposal.applied_version;

  select * into v_plan from public.training_plans
    where id = v_proposal.plan_id and user_id = v_user_id for update;
  if not found or v_plan.status <> 'active' then
    raise exception 'invalid_state' using errcode = 'PT409';
  end if;
  if v_plan.active_version <> v_applied then
    raise exception 'stale_version' using errcode = 'PT409';
  end if;

  v_today := (now() at time zone v_plan.time_zone)::date;
  if exists (
    select 1 from public.plan_sessions s
    where s.plan_id = v_plan.id
      and (
        (s.valid_from_version = v_applied and s.valid_to_version is null)
        or s.valid_to_version = v_applied
      )
      and (
        s.scheduled_on < v_today
        or exists (
          select 1 from public.session_activity_matches m
          where m.plan_id = v_plan.id and m.session_key = s.session_key
        )
      )
  ) then
    raise exception 'frozen_session' using errcode = 'PT422';
  end if;

  v_version := v_applied + 1;

  update public.plan_sessions set valid_to_version = v_version
    where plan_id = v_plan.id and valid_from_version = v_applied and valid_to_version is null;
  insert into public.plan_sessions (
    plan_id, user_id, session_key, valid_from_version, scheduled_on, sport, kind, title,
    purpose, is_key, priority, targets, structure, terrain, origin, contingencies
  )
  select plan_id, user_id, session_key, v_version, scheduled_on, sport, kind, title,
    purpose, is_key, priority, targets, structure, terrain, origin, contingencies
  from public.plan_sessions
  where plan_id = v_plan.id and valid_to_version = v_applied;

  update public.plan_weeks set valid_to_version = v_version
    where plan_id = v_plan.id and valid_from_version = v_applied and valid_to_version is null;
  insert into public.plan_weeks (
    plan_id, user_id, week_key, valid_from_version, week_start, block_key, week_type,
    target_duration_s, target_distance_m, target_elevation_m, quality_sessions,
    long_run_target_s, intensity_split, notes
  )
  select plan_id, user_id, week_key, v_version, week_start, block_key, week_type,
    target_duration_s, target_distance_m, target_elevation_m, quality_sessions,
    long_run_target_s, intensity_split, notes
  from public.plan_weeks
  where plan_id = v_plan.id and valid_to_version = v_applied;

  update public.plan_blocks set valid_to_version = v_version
    where plan_id = v_plan.id and valid_from_version = v_applied and valid_to_version is null;
  insert into public.plan_blocks (
    plan_id, user_id, block_key, valid_from_version, kind, name, starts_on, ends_on,
    objective, race_id
  )
  select plan_id, user_id, block_key, v_version, kind, name, starts_on, ends_on,
    objective, race_id
  from public.plan_blocks
  where plan_id = v_plan.id and valid_to_version = v_applied;

  update public.training_plans set active_version = v_version, updated_at = now()
    where id = v_plan.id;

  select * into v_base from public.plan_versions
    where plan_id = v_plan.id and version = v_proposal.base_version;
  insert into public.plan_versions (
    plan_id, version, user_id, parent_version, source_proposal_id, created_by,
    effective_from, race_roles, confidence, summary, content_hash
  )
  select v_plan.id, v_version, v_user_id, v_applied, v_proposal.id, 'athlete', v_today,
    coalesce(v_base.race_roles, applied.race_roles),
    coalesce(v_base.confidence, applied.confidence),
    left('Annulation · ' || v_proposal.title, 500),
    encode(
      pg_catalog.sha256(convert_to('revert:' || v_proposal.id::text || ':' || v_version, 'UTF8')),
      'hex'
    )
  from public.plan_versions applied
  where applied.plan_id = v_plan.id and applied.version = v_applied;

  update public.plan_proposals set status = 'reverted', updated_at = now()
    where id = v_proposal.id;
  insert into public.plan_decisions (user_id, proposal_id, decision, actor, resulting_version)
    values (v_user_id, v_proposal.id, 'reverted', 'athlete', v_version);

  return v_version;
end;
$$;

revoke all on function public.revert_plan_proposal(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.revert_plan_proposal(uuid) to authenticated;
