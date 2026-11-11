create function public.submit_athlete_session_move(
  p_plan_id uuid,
  p_base_version integer,
  p_session_key text,
  p_to_date date,
  p_title text,
  p_summary text,
  p_preview jsonb,
  p_rest_key text default null
)
returns public.plan_proposals
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_plan public.training_plans;
  v_proposal public.plan_proposals;
  v_operations jsonb := jsonb_build_array(jsonb_build_object(
    'op', 'move_session',
    'sessionKey', p_session_key,
    'toDate', to_char(p_to_date, 'YYYY-MM-DD')
  ));
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = 'PT401';
  end if;
  if p_session_key is null
    or char_length(p_session_key) not between 1 and 64
    or p_to_date is null
    or jsonb_typeof(p_preview) is distinct from 'object' then
    raise exception 'invalid_proposal' using errcode = 'PT400';
  end if;

  select * into v_plan from public.training_plans
    where id = p_plan_id and user_id = v_user_id;
  if not found or v_plan.status <> 'active' then
    raise exception 'not_found' using errcode = 'PT404';
  end if;
  if p_base_version is distinct from v_plan.active_version then
    raise exception 'stale_version' using errcode = 'PT409';
  end if;
  if p_rest_key is not null then
    if not exists (
      select 1 from public.plan_sessions
        where plan_id = p_plan_id
          and user_id = v_user_id
          and session_key = p_rest_key
          and scheduled_on = p_to_date
          and (kind = 'rest' or sport = 'rest')
          and valid_from_version <= v_plan.active_version
          and (valid_to_version is null or valid_to_version > v_plan.active_version)
    ) then
      raise exception 'invalid_proposal' using errcode = 'PT400';
    end if;
    v_operations := jsonb_build_array(
      jsonb_build_object('op', 'skip_session', 'sessionKey', p_rest_key)
    ) || v_operations;
  end if;

  insert into public.plan_proposals (
    user_id, plan_id, base_version, scope, origin, requested_by, status, title, summary,
    rationale, operations, preview, specialist_opinions, target_keys
  ) values (
    v_user_id, p_plan_id, p_base_version, 'session', 'schedule', 'athlete', 'accepted',
    p_title, p_summary, null, v_operations, p_preview, '[]',
    array_remove(array[p_session_key, p_rest_key], null)
  )
  returning * into v_proposal;

  insert into public.plan_decisions (user_id, proposal_id, decision, actor)
    values (v_user_id, v_proposal.id, 'accepted', 'athlete');

  return v_proposal;
end;
$$;

revoke all on function public.submit_athlete_session_move(
  uuid, integer, text, date, text, text, jsonb, text
) from public, anon, authenticated, service_role;
grant execute on function public.submit_athlete_session_move(
  uuid, integer, text, date, text, text, jsonb, text
) to authenticated;
