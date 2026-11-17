alter table public.coach_sessions
  add column writing_step jsonb check (writing_step is null or jsonb_typeof(writing_step) = 'object'),
  add column notify_when_ready boolean not null default false;

grant update (writing_step, notify_when_ready) on public.coach_sessions to authenticated;

create or replace function private.notify_coach_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_text text;
  v_question jsonb;
begin
  if tg_op = 'DELETE' then
    delete from public.notifications
      where user_id = old.user_id
        and kind in ('staff_reply', 'staff_question')
        and payload ->> 'threadId' = old.id::text;
    return null;
  end if;

  if new.title is not null and old.status = 'running' and new.status = 'idle' then
    select private.notification_excerpt(body ->> 'text') into v_text
      from public.coach_thread_items
      where coach_session_id = new.id
        and kind = 'coach'
        and created_at >= old.last_activity_at
        and btrim(coalesce(body ->> 'text', '')) <> ''
      order by id desc
      limit 1;
    if v_text is not null then
      insert into public.notifications (user_id, kind, dedupe_key, payload, occurred_at)
      values (
        new.user_id, 'staff_reply', 'staff_reply:' || new.id,
        jsonb_build_object(
          'threadId', new.id,
          'threadTitle', new.title,
          'agent', 'coach',
          'excerpt', v_text,
          'notify', old.notify_when_ready
        ),
        now()
      )
      on conflict (user_id, dedupe_key) do update set
        payload = excluded.payload,
        occurred_at = excluded.occurred_at,
        read_at = null;
    end if;
  end if;

  if old.pending_tool_use_id is not null
    and new.pending_tool_use_id is distinct from old.pending_tool_use_id then
    update public.notifications set
      resolved_at = now(),
      resolution = 'answered',
      read_at = coalesce(read_at, now())
    where user_id = new.user_id
      and dedupe_key = 'staff_question:' || new.id || ':' || old.pending_tool_use_id
      and resolved_at is null;
  end if;

  if new.title is not null
    and new.status = 'awaiting_athlete'
    and new.pending_tool_use_id is distinct from old.pending_tool_use_id then
    select body into v_question
      from public.coach_thread_items
      where coach_session_id = new.id
        and kind = 'question'
        and body ->> 'toolUseId' = new.pending_tool_use_id
      order by id desc
      limit 1;
    insert into public.notifications (user_id, kind, dedupe_key, payload, occurred_at)
    values (
      new.user_id, 'staff_question',
      'staff_question:' || new.id || ':' || new.pending_tool_use_id,
      jsonb_build_object(
        'threadId', new.id,
        'threadTitle', new.title,
        'agent', coalesce(v_question ->> 'askedFor', 'coach'),
        'toolUseId', new.pending_tool_use_id,
        'question', private.notification_excerpt(v_question ->> 'question')
      ),
      now()
    )
    on conflict (user_id, dedupe_key) do nothing;
  end if;

  if new.read_at is not null and new.read_at is distinct from old.read_at then
    update public.notifications set read_at = new.read_at
      where user_id = new.user_id
        and kind in ('staff_reply', 'staff_question')
        and payload ->> 'threadId' = new.id::text
        and read_at is null;
  end if;
  return null;
end;
$$;

create or replace function private.push_tick(p_now timestamptz default now())
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
  v_user uuid;
  v_batch record;
  v_body jsonb;
  v_ids uuid[];
  v_items jsonb;
  v_request bigint;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'push_dispatch_url' limit 1;
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'push_dispatch_secret' limit 1;
  if coalesce(btrim(v_url), '') = '' or coalesce(btrim(v_secret), '') = '' then
    return;
  end if;
  if not pg_try_advisory_xact_lock(hashtext('stride-push-tick')) then
    return;
  end if;

  for v_batch in
    select d.request_id, max(d.dispatched_at) as dispatched_at,
      r.id is not null as answered, r.status_code, r.content
    from public.push_deliveries d
    left join net._http_response r on r.id = d.request_id
    where d.status = 'sent'
    group by d.request_id, r.id, r.status_code, r.content
  loop
    continue when not v_batch.answered and v_batch.dispatched_at > p_now - interval '5 minutes';
    if v_batch.status_code is not null and v_batch.status_code not between 200 and 299 then
      update public.push_deliveries set
        status = case when attempts >= 3 then 'failed' else 'pending' end,
        request_id = null
      where request_id = v_batch.request_id and status = 'sent';
      continue;
    end if;
    v_body := case
      when v_batch.status_code is not null then private.push_json(v_batch.content)
    end;
    if jsonb_typeof(v_body) = 'object' then
      delete from public.push_subscriptions s
      where s.id::text = any (private.push_ids(v_body, 'gone'))
        and s.id in (
          select d.subscription_id from public.push_deliveries d
          where d.request_id = v_batch.request_id
        );
      update public.push_deliveries set
        status = case when attempts >= 3 then 'failed' else 'pending' end,
        request_id = null
      where request_id = v_batch.request_id
        and status = 'sent'
        and id::text = any (private.push_ids(v_body, 'failed'));
    end if;
    update public.push_deliveries set status = 'delivered', request_id = null
    where request_id = v_batch.request_id and status = 'sent';
  end loop;

  for v_user in select distinct s.user_id from public.push_subscriptions s loop
    begin
      perform private.reconcile_garmin_notifications_for(v_user, null);
    exception when others then
      raise warning 'push tick could not reconcile Garmin notifications: %', sqlerrm;
    end;
  end loop;

  insert into public.push_deliveries (
    subscription_id, user_id, notification_id, dedupe_key, kind, payload, occurred_at
  )
  select
    s.id, s.user_id, n.id,
    'notification:' || n.id || ':' || extract(epoch from n.occurred_at),
    n.kind, n.payload, n.occurred_at
  from public.push_subscriptions s
  left join public.push_preferences p on p.user_id = s.user_id
  join public.notifications n on n.user_id = s.user_id
  where n.occurred_at >= greatest(p_now - interval '6 hours', s.created_at)
    and n.read_at is null
    and n.resolved_at is null
    and case
      when n.kind in ('plan_proposal', 'staff_question')
        then coalesce(p.plan_staff, true)
      when n.kind = 'staff_reply'
        then coalesce(p.plan_staff, true) and n.payload ->> 'notify' = 'true'
      when n.kind = 'garmin_activity' then coalesce(p.debrief, true)
      when n.kind in ('garmin_connection', 'watch_workout') then coalesce(p.garmin_issues, true)
      else false
    end
  on conflict (subscription_id, dedupe_key) do nothing;

  insert into public.push_deliveries (
    subscription_id, user_id, dedupe_key, kind, payload, occurred_at
  )
  select
    s.id, s.user_id,
    'session_reminder:' || t.plan_id || ':' || t.day,
    'session_reminder',
    jsonb_build_object('day', t.day, 'sessions', t.sessions),
    p_now
  from (
    select tp.id as plan_id, tp.user_id, (p_now at time zone tp.time_zone)::date as day,
      jsonb_agg(
        jsonb_build_object(
          'title', ps.title,
          'isKey', ps.is_key,
          'durationSeconds', case
            when jsonb_typeof(ps.targets -> 'durationSeconds') = 'number'
              then (ps.targets ->> 'durationSeconds')::numeric
          end
        )
        order by ps.is_key desc, ps.session_key
      ) as sessions
    from (
      select p.* from public.training_plans p
      where p.status = 'active'
        and p.time_zone in (select z.name from pg_catalog.pg_timezone_names z)
      offset 0
    ) tp
    join public.plan_sessions ps
      on ps.plan_id = tp.id
      and ps.valid_to_version is null
      and ps.scheduled_on = (p_now at time zone tp.time_zone)::date
      and ps.sport <> 'rest'
      and ps.kind <> 'rest'
    where tp.status = 'active'
      and (p_now at time zone tp.time_zone)::time >= time '07:00'
      and (p_now at time zone tp.time_zone)::time < time '12:00'
      and exists (select 1 from public.push_subscriptions x where x.user_id = tp.user_id)
      and not exists (
        select 1 from public.session_activity_matches m
        where m.plan_id = tp.id and m.session_key = ps.session_key
      )
    group by tp.id, tp.user_id, tp.time_zone
  ) t
  join public.push_subscriptions s on s.user_id = t.user_id
  left join public.push_preferences p on p.user_id = t.user_id
  where coalesce(p.session_reminder, true)
  on conflict (subscription_id, dedupe_key) do nothing;

  update public.push_deliveries d set status = 'failed'
  from (
    select d2.id
    from public.push_deliveries d2
    left join public.push_preferences p on p.user_id = d2.user_id
    left join public.notifications n on n.id = d2.notification_id
    where d2.status = 'pending'
      and (
        not case
          when d2.kind = 'session_reminder' then coalesce(p.session_reminder, true)
          when d2.kind in ('plan_proposal', 'staff_question')
            then coalesce(p.plan_staff, true)
          when d2.kind = 'staff_reply'
            then coalesce(p.plan_staff, true) and d2.payload ->> 'notify' = 'true'
          when d2.kind = 'garmin_activity' then coalesce(p.debrief, true)
          when d2.kind in ('garmin_connection', 'watch_workout')
            then coalesce(p.garmin_issues, true)
          else false
        end
        or (d2.notification_id is not null
          and (n.id is null or n.read_at is not null or n.resolved_at is not null))
      )
  ) stale
  where d.id = stale.id;

  select coalesce(array_agg(b.id), '{}'), coalesce(jsonb_agg(b.item), '[]')
  into v_ids, v_items
  from (
    select d.id, jsonb_build_object(
      'id', d.id,
      'subscription', jsonb_build_object(
        'id', s.id,
        'endpoint', s.endpoint,
        'keys', jsonb_build_object('p256dh', s.p256dh, 'auth', s.auth)
      ),
      'kind', d.kind,
      'payload', d.payload,
      'occurredAt', d.occurred_at,
      'faces', jsonb_build_object(
        'coach', a.coach_face,
        'medical', a.medical_face,
        'director', a.director_face,
        'strategist', a.strategist_face,
        'nutritionist', a.nutritionist_face
      )
    ) as item
    from public.push_deliveries d
    join public.push_subscriptions s on s.id = d.subscription_id
    left join public.athlete_profiles a on a.user_id = d.user_id
    where d.status = 'pending'
    order by d.occurred_at
    limit 50
    for update of d skip locked
  ) b;

  if cardinality(v_ids) > 0 then
    v_request := net.http_post(
      url := v_url,
      body := jsonb_build_object('deliveries', v_items),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_secret
      ),
      timeout_milliseconds := 60000
    );
    update public.push_deliveries set
      status = 'sent',
      request_id = v_request,
      attempts = attempts + 1,
      dispatched_at = p_now
    where id = any (v_ids);
  end if;

  delete from public.push_deliveries
  where status in ('delivered', 'failed') and created_at < p_now - interval '7 days';
end;
$$;

