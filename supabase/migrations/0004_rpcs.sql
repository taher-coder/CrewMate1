-- ============================================================================
-- CrewMate — Privileged RPCs (Migration 0004)
--
-- Migration 0003 revoked direct client UPDATE access to the columns that
-- carry business-critical state (job/request status, company verification,
-- profile role). These SECURITY DEFINER functions are the only door back
-- in: each checks the caller's relationship to the row, then performs
-- exactly one legal transition. The app calls these instead of raw UPDATEs.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- WORKER: advance their own job through the lifecycle (sec 8.6)
-- ----------------------------------------------------------------------------

create or replace function advance_job_status(p_job_id uuid, p_new_status job_status, p_notes text default null)
returns jobs as $$
declare
  v_job jobs;
begin
  select * into v_job from jobs where id = p_job_id;
  if v_job is null then
    raise exception 'Job not found';
  end if;
  if v_job.worker_id <> my_worker_id() then
    raise exception 'Not your job';
  end if;

  update jobs set status = p_new_status where id = p_job_id
  returning * into v_job;

  if p_notes is not null then
    update job_status_history set notes = p_notes
      where job_id = p_job_id and status = p_new_status
      and id = (select id from job_status_history where job_id = p_job_id order by created_at desc limit 1);
  end if;

  return v_job;
end;
$$ language plpgsql security definer;

grant execute on function advance_job_status(uuid, job_status, text) to authenticated;

-- ----------------------------------------------------------------------------
-- COMPANY DISPATCH: assign/reassign a worker (validated by the trigger in
-- 0002; this RPC just gives a safe, auditable entry point instead of a raw
-- UPDATE grant on jobs.worker_id)
-- ----------------------------------------------------------------------------

create or replace function assign_worker(p_job_id uuid, p_worker_id uuid)
returns jobs as $$
declare
  v_job jobs;
begin
  select * into v_job from jobs where id = p_job_id;
  if v_job is null then raise exception 'Job not found'; end if;
  if not is_company_member(v_job.company_id) then
    raise exception 'Not your company''s job';
  end if;

  update jobs set worker_id = p_worker_id where id = p_job_id returning * into v_job;

  insert into audit_logs (actor_id, action, entity_type, entity_id, after)
  values (auth.uid(), 'job.assign_worker', 'jobs', p_job_id, jsonb_build_object('worker_id', p_worker_id));

  return v_job;
end;
$$ language plpgsql security definer;

grant execute on function assign_worker(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- CUSTOMER: cancel their own request (the only client-triggerable request
-- transition — everything else is system-driven, sec 5.5)
-- ----------------------------------------------------------------------------

create or replace function cancel_request(p_request_id uuid, p_reason text default null)
returns requests as $$
declare
  v_request requests;
begin
  select * into v_request from requests where id = p_request_id;
  if v_request is null then raise exception 'Request not found'; end if;
  if v_request.customer_id <> auth.uid() then
    raise exception 'Not your request';
  end if;

  update requests set status = 'cancelled', updated_at = now() where id = p_request_id
  returning * into v_request;

  update jobs set status = 'cancelled', cancellation_reason = p_reason
    where request_id = p_request_id and status not in ('completed', 'cancelled');

  return v_request;
end;
$$ language plpgsql security definer;

grant execute on function cancel_request(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- ADMIN: decide a company application (sec 6.3) — the only path that can
-- move companies.status, always logged to audit_logs.
-- ----------------------------------------------------------------------------

create or replace function admin_decide_company_application(
  p_application_id uuid,
  p_decision company_app_status, -- 'under_review' | 'info_requested' | 'verified' | 'rejected'
  p_notes text default null
)
returns company_applications as $$
declare
  v_app company_applications;
  v_before company_app_status;
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  select * into v_app from company_applications where id = p_application_id;
  if v_app is null then raise exception 'Application not found'; end if;
  v_before := v_app.status;

  update company_applications
    set status = p_decision, info_requested_notes = coalesce(p_notes, info_requested_notes),
        reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_application_id
    returning * into v_app;

  insert into audit_logs (actor_id, action, entity_type, entity_id, before, after)
  values (
    auth.uid(), 'company_application.decide', 'company_applications', p_application_id,
    jsonb_build_object('status', v_before), jsonb_build_object('status', p_decision, 'notes', p_notes)
  );

  return v_app;
end;
$$ language plpgsql security definer;

grant execute on function admin_decide_company_application(uuid, company_app_status, text) to authenticated;

-- ----------------------------------------------------------------------------
-- ADMIN: suspend / reactivate a company (sec 9.3) — always audited
-- ----------------------------------------------------------------------------

create or replace function admin_set_company_suspension(p_company_id uuid, p_suspended boolean, p_reason text default null)
returns companies as $$
declare
  v_company companies;
begin
  if not is_admin() then raise exception 'Admin only'; end if;

  update companies
    set status = case when p_suspended then 'suspended' else 'verified' end,
        suspended_reason = case when p_suspended then p_reason else null end,
        updated_at = now()
    where id = p_company_id
    returning * into v_company;

  insert into audit_logs (actor_id, action, entity_type, entity_id, after)
  values (auth.uid(), 'company.set_suspension', 'companies', p_company_id,
          jsonb_build_object('suspended', p_suspended, 'reason', p_reason));

  return v_company;
end;
$$ language plpgsql security definer;

grant execute on function admin_set_company_suspension(uuid, boolean, text) to authenticated;

-- ----------------------------------------------------------------------------
-- COMPANY: respond to a review (only touches company_response, never rating)
-- ----------------------------------------------------------------------------

create or replace function company_respond_to_review(p_review_id uuid, p_response text)
returns reviews as $$
declare
  v_review reviews;
begin
  select * into v_review from reviews where id = p_review_id;
  if v_review is null then raise exception 'Review not found'; end if;
  if not is_company_member(v_review.company_id) then
    raise exception 'Not your company''s review';
  end if;

  update reviews set company_response = p_response where id = p_review_id
  returning * into v_review;

  return v_review;
end;
$$ language plpgsql security definer;

grant execute on function company_respond_to_review(uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- ADMIN: moderate a review (sec 9.11) — flag / investigate / hide / restore
-- ----------------------------------------------------------------------------

create or replace function admin_moderate_review(p_review_id uuid, p_action text, p_reason text default null)
returns reviews as $$
declare
  v_review reviews;
  v_state review_moderation_state;
begin
  if not is_admin() then raise exception 'Admin only'; end if;
  if p_action not in ('flag', 'investigate', 'hide', 'restore') then
    raise exception 'Invalid moderation action %', p_action;
  end if;

  v_state := case p_action
    when 'hide' then 'hidden'
    when 'restore' then 'visible'
    else (select moderation_state from reviews where id = p_review_id) -- flag/investigate don't change visibility
  end;

  update reviews set moderation_state = v_state where id = p_review_id returning * into v_review;

  insert into review_moderation_log (review_id, admin_id, action, reason)
  values (p_review_id, auth.uid(), p_action, p_reason);

  return v_review;
end;
$$ language plpgsql security definer;

grant execute on function admin_moderate_review(uuid, text, text) to authenticated;
