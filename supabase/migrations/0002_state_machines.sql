-- ============================================================================
-- CrewMate — State Machines & Business-Rule Triggers (Migration 0002)
--
-- Blueprint principle (sec 13): "These rules must be enforced by the backend
-- and database, not merely hidden in the interface." This migration is that
-- enforcement layer — every status change, every assignment, every review
-- goes through a trigger that checks the transition is legal, not just that
-- the caller is allowed to write the row (RLS, migration 0003, handles that).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. JOB LIFECYCLE (sec 8.6)
--    ASSIGNED -> ON_THE_WAY -> ARRIVED -> IN_PROGRESS -> COMPLETED
--    CANCELLED is reachable from any non-terminal state.
--    No step may be skipped; nothing may move after COMPLETED or CANCELLED.
-- ----------------------------------------------------------------------------

create or replace function fn_validate_job_transition()
returns trigger as $$
declare
  allowed boolean := false;
begin
  if TG_OP = 'INSERT' then
    if new.status <> 'assigned' then
      raise exception 'New jobs must start in status assigned, got %', new.status;
    end if;
    return new;
  end if;

  if old.status = new.status then
    return new; -- no-op update (e.g. touching worker_id) is fine
  end if;

  if old.status in ('completed', 'cancelled') then
    raise exception 'Job % is terminal (%) and cannot change status', old.id, old.status;
  end if;

  allowed := case old.status
    when 'assigned'     then new.status in ('on_the_way', 'cancelled')
    when 'on_the_way'   then new.status in ('arrived', 'cancelled')
    when 'arrived'      then new.status in ('in_progress', 'cancelled')
    when 'in_progress'  then new.status in ('completed', 'cancelled')
    else false
  end;

  if not allowed then
    raise exception 'Illegal job transition: % -> %', old.status, new.status;
  end if;

  -- stamp the matching timestamp column
  if new.status = 'on_the_way' then new.on_the_way_at := now();
  elsif new.status = 'arrived' then new.arrived_at := now();
  elsif new.status = 'in_progress' then new.in_progress_at := now();
  elsif new.status = 'completed' then new.completed_at := now();
  elsif new.status = 'cancelled' then new.cancelled_at := coalesce(new.cancelled_at, now());
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_validate_job_transition
  before insert or update of status on jobs
  for each row execute function fn_validate_job_transition();

-- Every status change is appended to job_status_history automatically —
-- this is what admin's "complete lifecycle" view (sec 9.5) reads from.
create or replace function fn_log_job_status_history()
returns trigger as $$
begin
  insert into job_status_history (job_id, status, changed_by, notes)
  values (new.id, new.status, coalesce(current_setting('request.jwt.claim.sub', true)::uuid, null), null);
  return new;
end;
$$ language plpgsql;

create trigger trg_log_job_status_history
  after insert or update of status on jobs
  for each row execute function fn_log_job_status_history();

-- Completion row can only be written once the job is actually completed,
-- and can't be duplicated (sec 8.7: "prevents duplicate completion submissions").
create or replace function fn_validate_job_completion()
returns trigger as $$
declare
  job_current_status job_status;
begin
  select status into job_current_status from jobs where id = new.job_id;
  if job_current_status <> 'completed' then
    raise exception 'Cannot record completion details before job status is completed (currently %)', job_current_status;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_validate_job_completion
  before insert on job_completions
  for each row execute function fn_validate_job_completion();

-- ----------------------------------------------------------------------------
-- 2. WORKER ASSIGNMENT VALIDATION (sec 7.4 — dispatch assignment checks)
--    "Worker belongs to company; worker is active; worker is eligible for
--    the service; job is in a state that permits assignment."
-- ----------------------------------------------------------------------------

create or replace function fn_validate_worker_assignment()
returns trigger as $$
declare
  w_company_id uuid;
  w_status worker_account_status;
  req_category_id uuid;
  is_eligible boolean;
begin
  if new.worker_id is null then
    return new; -- un-assigning is fine, dispatch can do this while deciding
  end if;

  select company_id, status into w_company_id, w_status from workers where id = new.worker_id;

  if w_company_id is null then
    raise exception 'Worker % does not exist', new.worker_id;
  end if;

  if w_company_id <> new.company_id then
    raise exception 'Worker % does not belong to company %', new.worker_id, new.company_id;
  end if;

  if w_status <> 'active' then
    raise exception 'Worker % is not active (status: %)', new.worker_id, w_status;
  end if;

  select category_id into req_category_id from requests where id = new.request_id;

  select exists (
    select 1 from worker_services ws where ws.worker_id = new.worker_id and ws.category_id = req_category_id
  ) into is_eligible;

  if not is_eligible then
    raise exception 'Worker % is not eligible for service category %', new.worker_id, req_category_id;
  end if;

  if TG_OP = 'UPDATE' and old.status in ('completed', 'cancelled') then
    raise exception 'Cannot (re)assign a worker on a terminal job';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_validate_worker_assignment
  before insert or update of worker_id on jobs
  for each row execute function fn_validate_worker_assignment();

-- ----------------------------------------------------------------------------
-- 3. REQUEST OFFER -> JOB CREATION (sec 10.2, 10.3)
--    When a company accepts an offer: all other pending offers for that
--    request are revoked, the request moves to company_accepted, and a job
--    row is created in status 'assigned' (unassigned worker yet).
-- ----------------------------------------------------------------------------

-- The matching system creating offers IS "companies notified" (sec 10.2) —
-- drive the customer-visible request status from here, not by hoping
-- something else remembered to.
create or replace function fn_handle_offer_created()
returns trigger as $$
begin
  update requests
    set status = 'companies_notified', updated_at = now()
    where id = new.request_id and status in ('submitted', 'finding_companies');
  return new;
end;
$$ language plpgsql;

create trigger trg_handle_offer_created
  after insert on request_offers
  for each row execute function fn_handle_offer_created();

create or replace function fn_handle_offer_acceptance()
returns trigger as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    new.responded_at := now();

    -- revoke every other still-pending offer for this request
    update request_offers
      set status = 'revoked', responded_at = now()
      where request_id = new.request_id
        and id <> new.id
        and status = 'pending';

    update requests
      set status = 'company_accepted', updated_at = now()
      where id = new.request_id;

    insert into jobs (request_id, company_id, status)
    values (new.request_id, new.company_id, 'assigned')
    on conflict (request_id) do nothing; -- idempotency guard

    update requests
      set status = 'worker_assignment_pending', updated_at = now()
      where id = new.request_id;

  elsif new.status = 'rejected' and old.status = 'pending' then
    new.responded_at := now();
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_handle_offer_acceptance
  before update of status on request_offers
  for each row execute function fn_handle_offer_acceptance();

-- When a job gets its first worker assigned, flip the request to
-- 'professional_assigned' so the customer app (sec 5.6) reflects reality.
create or replace function fn_handle_worker_assigned()
returns trigger as $$
begin
  if new.worker_id is not null and (old.worker_id is null) then
    update requests set status = 'professional_assigned', updated_at = now()
      where id = new.request_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_handle_worker_assigned
  after update of worker_id on jobs
  for each row execute function fn_handle_worker_assigned();

-- ----------------------------------------------------------------------------
-- 4. REQUEST STATUS GUARD — mirrors the customer-visible states in sec 5.5
--    and forbids the "never pretend a company accepted" rule by construction:
--    the only way to reach company_accepted/professional_assigned is via the
--    offer/job triggers above, never a direct client update.
-- ----------------------------------------------------------------------------

create or replace function fn_validate_request_transition()
returns trigger as $$
declare
  allowed boolean;
begin
  if TG_OP = 'INSERT' then
    return new;
  end if;
  if old.status = new.status then
    return new;
  end if;
  if old.status in ('no_match', 'cancelled') then
    raise exception 'Request % is terminal (%)', old.id, old.status;
  end if;
  allowed := case old.status
    when 'submitted'               then new.status in ('finding_companies', 'companies_notified', 'no_match', 'cancelled')
    when 'finding_companies'       then new.status in ('companies_notified', 'no_match', 'cancelled')
    when 'companies_notified'      then new.status in ('company_accepted', 'no_match', 'cancelled')
    when 'company_accepted'        then new.status in ('worker_assignment_pending', 'cancelled')
    when 'worker_assignment_pending' then new.status in ('professional_assigned', 'cancelled')
    when 'professional_assigned'   then new.status in ('cancelled')
    else false
  end;
  if not allowed then
    raise exception 'Illegal request transition: % -> %', old.status, new.status;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_validate_request_transition
  before update of status on requests
  for each row execute function fn_validate_request_transition();

-- ----------------------------------------------------------------------------
-- 5. COMPANY APPLICATION WORKFLOW (sec 6.3)
--    Applied -> Under Review -> Information Requested <-> Under Review
--            -> Verified | Rejected ; Verified -> Suspended -> Verified
-- ----------------------------------------------------------------------------

create or replace function fn_validate_company_app_transition()
returns trigger as $$
declare
  allowed boolean;
begin
  if TG_OP = 'INSERT' then
    return new;
  end if;
  if old.status = new.status then
    return new;
  end if;
  allowed := case old.status
    when 'applied'        then new.status in ('under_review')
    when 'under_review'   then new.status in ('info_requested', 'verified', 'rejected')
    when 'info_requested' then new.status in ('under_review')
    when 'verified'       then new.status in ('suspended')
    when 'suspended'      then new.status in ('verified')
    when 'rejected'       then false -- rejected companies must re-apply (new row), not reopen
    else false
  end;
  if not allowed then
    raise exception 'Illegal company application transition: % -> %', old.status, new.status;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_validate_company_app_transition
  before update of status on company_applications
  for each row execute function fn_validate_company_app_transition();

-- Keep companies.status mirrored to its latest application decision, and
-- gate marketplace eligibility (sec 6.4) off that single column.
create or replace function fn_sync_company_status()
returns trigger as $$
begin
  update companies set status = new.status, updated_at = now() where id = new.company_id;
  return new;
end;
$$ language plpgsql;

create trigger trg_sync_company_status
  after update of status on company_applications
  for each row execute function fn_sync_company_status();

-- ----------------------------------------------------------------------------
-- 6. SUPPORT TICKET WORKFLOW (sec 9.10)
--    OPEN -> ASSIGNED -> INVESTIGATING -> WAITING -> RESOLVED -> CLOSED
--    Reopening only through a defined transition (RESOLVED/CLOSED -> ASSIGNED).
-- ----------------------------------------------------------------------------

create or replace function fn_validate_support_transition()
returns trigger as $$
declare
  allowed boolean;
begin
  if TG_OP = 'INSERT' then
    return new;
  end if;
  if old.status = new.status then
    return new;
  end if;
  allowed := case old.status
    when 'open'           then new.status in ('assigned', 'closed')
    when 'assigned'       then new.status in ('investigating', 'waiting', 'resolved')
    when 'investigating'  then new.status in ('waiting', 'resolved')
    when 'waiting'        then new.status in ('investigating', 'resolved')
    when 'resolved'       then new.status in ('closed', 'assigned') -- reopen
    when 'closed'         then new.status in ('assigned')          -- reopen
    else false
  end;
  if not allowed then
    raise exception 'Illegal support ticket transition: % -> %', old.status, new.status;
  end if;
  if new.status = 'resolved' then new.resolved_at := now();
  elsif new.status = 'closed' then new.closed_at := now();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_validate_support_transition
  before update of status on support_tickets
  for each row execute function fn_validate_support_transition();

-- ----------------------------------------------------------------------------
-- 7. REVIEW ELIGIBILITY (sec 5.10 — "only eligible customers who completed
--    the relevant booking can submit a review")
-- ----------------------------------------------------------------------------

create or replace function fn_validate_review_eligibility()
returns trigger as $$
declare
  j_status job_status;
  j_customer_id uuid;
  j_request_id uuid;
begin
  select jobs.status, requests.customer_id, jobs.request_id
    into j_status, j_customer_id, j_request_id
    from jobs join requests on requests.id = jobs.request_id
    where jobs.id = new.job_id;

  if j_status is null then
    raise exception 'Job % not found', new.job_id;
  end if;
  if j_status <> 'completed' then
    raise exception 'Cannot review job % before it is completed', new.job_id;
  end if;
  if j_customer_id <> new.customer_id then
    raise exception 'Only the customer on job % may review it', new.job_id;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_validate_review_eligibility
  before insert on reviews
  for each row execute function fn_validate_review_eligibility();

-- ----------------------------------------------------------------------------
-- 8. PAYMENTS ARE SERVER-WRITTEN ONLY
--    No INSERT/UPDATE grant is given to authenticated roles on `payments`
--    or `commissions` (see migration 0003). Only the service_role (used by
--    a trusted webhook handler, e.g. a Razorpay webhook edge function) may
--    write these tables. This function exists purely to document/assert it;
--    the real enforcement is the GRANT/RLS setup in 0003.
-- ----------------------------------------------------------------------------

comment on table payments is
  'Written only by the server-side payment webhook handler (service_role). '
  'Never insert/update from client code — see sec 9.9: must not pretend to '
  'have collected money.';
