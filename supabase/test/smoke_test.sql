-- Functional smoke test: runs the real customer -> company -> worker -> job
-- flow through the actual triggers/RPCs, then checks that illegal moves and
-- cross-tenant reads are rejected. Prints PASS/FAIL per assertion.

set client_min_messages to notice;

-- ---- fixtures -------------------------------------------------------------

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'customer@test.com'),
  ('00000000-0000-0000-0000-000000000002', 'owner@test.com'),
  ('00000000-0000-0000-0000-000000000003', 'worker@test.com'),
  ('00000000-0000-0000-0000-000000000004', 'admin@test.com'),
  ('00000000-0000-0000-0000-000000000005', 'other_customer@test.com');

insert into profiles (id, role, full_name, phone) values
  ('00000000-0000-0000-0000-000000000001', 'customer', 'Asha Customer', '+910001'),
  ('00000000-0000-0000-0000-000000000002', 'company_owner', 'Raj Owner', '+910002'),
  ('00000000-0000-0000-0000-000000000003', 'worker', 'Vikram Worker', '+910003'),
  ('00000000-0000-0000-0000-000000000004', 'admin', 'Admin User', '+910004'),
  ('00000000-0000-0000-0000-000000000005', 'customer', 'Other Customer', '+910005');

insert into service_categories (id, name, slug) values
  ('10000000-0000-0000-0000-000000000001', 'Plumbing', 'plumbing');

insert into companies (id, legal_name, city, status) values
  ('20000000-0000-0000-0000-000000000001', 'Ahmedabad Plumbers Co', 'Ahmedabad', 'verified');

insert into company_members (company_id, profile_id, member_role) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'owner');

insert into company_services (company_id, category_id) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001');

insert into workers (id, company_id, profile_id, full_name, status) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000003', 'Vikram Worker', 'active');

insert into worker_services (worker_id, category_id) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001');

insert into addresses (id, profile_id, line1, city, location) values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   '12 MG Road', 'Ahmedabad', 'SRID=4326;POINT(72.5714 23.0225)');

insert into requests (id, customer_id, category_id, address_id, location, time_type) values
  ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001',
   'SRID=4326;POINT(72.5714 23.0225)', 'asap');

insert into request_offers (id, request_id, company_id, status) values
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001', 'pending');

-- ---- T1: accepting an offer creates a job and advances the request -------

update request_offers set status = 'accepted' where id = '60000000-0000-0000-0000-000000000001';

do $$
declare v_status request_status; v_job_count int;
begin
  select status into v_status from requests where id = '50000000-0000-0000-0000-000000000001';
  select count(*) into v_job_count from jobs where request_id = '50000000-0000-0000-0000-000000000001';
  if v_status = 'worker_assignment_pending' and v_job_count = 1 then
    raise notice 'PASS T1: offer acceptance created job and advanced request (status=%)', v_status;
  else
    raise exception 'FAIL T1: status=%, job_count=%', v_status, v_job_count;
  end if;
end $$;

-- ---- T2: assigning the worker via RPC, as the owner, works ---------------

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);

do $$
declare v_job_id uuid;
begin
  select id into v_job_id from jobs where request_id = '50000000-0000-0000-0000-000000000001';
  perform assign_worker(v_job_id, '30000000-0000-0000-0000-000000000001');
  raise notice 'PASS T2: company owner assigned worker via RPC';
end $$;

do $$
declare v_status request_status;
begin
  select status into v_status from requests where id = '50000000-0000-0000-0000-000000000001';
  if v_status = 'professional_assigned' then
    raise notice 'PASS T2b: request auto-advanced to professional_assigned';
  else
    raise exception 'FAIL T2b: status=%', v_status;
  end if;
end $$;

-- ---- T3: worker cannot skip a lifecycle step (assigned -> in_progress) ---

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);

do $$
declare v_job_id uuid; v_failed boolean := false;
begin
  select id into v_job_id from jobs where request_id = '50000000-0000-0000-0000-000000000001';
  begin
    perform advance_job_status(v_job_id, 'in_progress');
  exception when others then
    v_failed := true;
  end;
  if v_failed then
    raise notice 'PASS T3: skipping on_the_way/arrived was rejected';
  else
    raise exception 'FAIL T3: illegal skip to in_progress was allowed';
  end if;
end $$;

-- ---- T4: worker advances legally through the full lifecycle ---------------

do $$
declare v_job_id uuid; v_status job_status;
begin
  select id into v_job_id from jobs where request_id = '50000000-0000-0000-0000-000000000001';
  perform advance_job_status(v_job_id, 'on_the_way');
  perform advance_job_status(v_job_id, 'arrived');
  perform advance_job_status(v_job_id, 'in_progress');
  perform advance_job_status(v_job_id, 'completed');
  select status into v_status from jobs where id = v_job_id;
  if v_status = 'completed' then
    raise notice 'PASS T4: full legal lifecycle succeeded, job completed';
  else
    raise exception 'FAIL T4: ended in status %', v_status;
  end if;
end $$;

-- ---- T5: nothing can move after completed (terminal state) --------------

do $$
declare v_job_id uuid; v_failed boolean := false;
begin
  select id into v_job_id from jobs where request_id = '50000000-0000-0000-0000-000000000001';
  begin
    perform advance_job_status(v_job_id, 'on_the_way');
  exception when others then
    v_failed := true;
  end;
  if v_failed then
    raise notice 'PASS T5: completed job correctly rejected further transitions';
  else
    raise exception 'FAIL T5: completed job accepted a new transition';
  end if;
end $$;

-- ---- T6: customer can review their own completed job ---------------------

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);

do $$
declare v_job_id uuid;
begin
  select id into v_job_id from jobs where request_id = '50000000-0000-0000-0000-000000000001';
  insert into reviews (job_id, customer_id, company_id, rating, comment)
  values (v_job_id, '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 5, 'Great work');
  raise notice 'PASS T6: customer review on own completed job accepted';
end $$;

-- ---- T7: a DIFFERENT customer cannot review that job ----------------------

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);

do $$
declare v_job_id uuid; v_failed boolean := false;
begin
  select id into v_job_id from jobs where request_id = '50000000-0000-0000-0000-000000000001';
  begin
    insert into reviews (job_id, customer_id, company_id, rating, comment)
    values (v_job_id, '00000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 1, 'not my job');
  exception when others then
    v_failed := true;
  end;
  if v_failed then
    raise notice 'PASS T7: a different customer cannot review someone else''s job';
  else
    raise exception 'FAIL T7: cross-customer review was allowed';
  end if;
end $$;

-- ---- T8: RLS — other customer cannot even SELECT this request (set role) -

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);

do $$
declare v_count int;
begin
  select count(*) into v_count from requests where id = '50000000-0000-0000-0000-000000000001';
  if v_count = 0 then
    raise notice 'PASS T8: other customer sees zero rows for someone else''s request (RLS)';
  else
    raise exception 'FAIL T8: other customer could see % rows of someone else''s request', v_count;
  end if;
end $$;

reset role;

-- ---- T9: RLS — the request's own customer CAN see it ---------------------

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);

do $$
declare v_count int;
begin
  select count(*) into v_count from requests where id = '50000000-0000-0000-0000-000000000001';
  if v_count = 1 then
    raise notice 'PASS T9: owning customer can see their own request (RLS)';
  else
    raise exception 'FAIL T9: owning customer saw % rows (expected 1)', v_count;
  end if;
end $$;

reset role;

-- ---- T10: company member CAN read the customer's profile on their job ----

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);

do $$
declare v_name text;
begin
  select full_name into v_name from profiles where id = '00000000-0000-0000-0000-000000000001';
  if v_name = 'Asha Customer' then
    raise notice 'PASS T10: company member can read their customer''s profile';
  else
    raise exception 'FAIL T10: company member could not read customer profile (got %)', v_name;
  end if;
end $$;

reset role;

-- ---- T11: customer CAN read the assigned worker's profile + worker row --

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);

do $$
declare v_name text; v_worker_name text;
begin
  select full_name into v_name from profiles where id = '00000000-0000-0000-0000-000000000003';
  select full_name into v_worker_name from workers where id = '30000000-0000-0000-0000-000000000001';
  if v_name = 'Vikram Worker' and v_worker_name = 'Vikram Worker' then
    raise notice 'PASS T11: customer can read the assigned worker''s profile and worker row';
  else
    raise exception 'FAIL T11: customer could not read worker info (profile=%, worker=%)', v_name, v_worker_name;
  end if;
end $$;

reset role;

-- ---- T12: an UNRELATED customer still cannot read that worker/profile ----

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);

do $$
declare v_count int;
begin
  select count(*) into v_count from profiles where id = '00000000-0000-0000-0000-000000000003';
  if v_count = 0 then
    raise notice 'PASS T12: unrelated customer cannot see the worker''s profile (no shared job)';
  else
    raise exception 'FAIL T12: unrelated customer could see the worker''s profile';
  end if;
end $$;

reset role;

-- ---- T13: messages leak check ---------------------------------------------
-- Build a conversation between the customer and the company owner on the
-- real job, AND a second, totally unrelated conversation that the "other
-- customer" (0005) participates in. Before the fix, being a participant in
-- ANY conversation let you read messages in EVERY conversation — this
-- proves that's no longer true.

insert into conversations (id, job_id) values
  ('70000000-0000-0000-0000-000000000001', (select id from jobs where request_id = '50000000-0000-0000-0000-000000000001'));
insert into conversation_participants (conversation_id, profile_id) values
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');

insert into conversations (id) values ('70000000-0000-0000-0000-000000000002');
insert into conversation_participants (conversation_id, profile_id) values
  ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
do $$
begin
  insert into messages (conversation_id, sender_id, body)
  values ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'When will the plumber arrive?');
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);
do $$
declare v_count int;
begin
  select count(*) into v_count from messages where conversation_id = '70000000-0000-0000-0000-000000000001';
  if v_count = 0 then
    raise notice 'PASS T13: a participant in an unrelated conversation cannot read this one''s messages';
  else
    raise exception 'FAIL T13: cross-conversation message leak — unrelated participant saw % messages', v_count;
  end if;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
do $$
declare v_count int;
begin
  select count(*) into v_count from messages where conversation_id = '70000000-0000-0000-0000-000000000001';
  if v_count = 1 then
    raise notice 'PASS T13b: the actual participant (company owner) can read the message';
  else
    raise exception 'FAIL T13b: real participant saw % messages (expected 1)', v_count;
  end if;
end $$;
reset role;

-- ---- T14: quote_items is scoped to the job's real parties, not "quote exists" ----

insert into quotes (id, job_id, amount, status) values
  ('80000000-0000-0000-0000-000000000001', (select id from jobs where request_id = '50000000-0000-0000-0000-000000000001'), 1200.00, 'pending');
insert into quote_items (quote_id, description, amount) values
  ('80000000-0000-0000-0000-000000000001', 'Pipe replacement', 1200.00);

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', false);
do $$
declare v_count int;
begin
  select count(*) into v_count from quote_items where quote_id = '80000000-0000-0000-0000-000000000001';
  if v_count = 0 then
    raise notice 'PASS T14: an unrelated customer cannot read this job''s quote line items';
  else
    raise exception 'FAIL T14: unrelated customer could read quote_items (saw % rows)', v_count;
  end if;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
do $$
declare v_count int;
begin
  select count(*) into v_count from quote_items where quote_id = '80000000-0000-0000-0000-000000000001';
  if v_count = 1 then
    raise notice 'PASS T14b: the job''s own customer can read the quote line items';
  else
    raise exception 'FAIL T14b: job''s own customer could not read quote_items (saw % rows)', v_count;
  end if;
end $$;
reset role;

do $$ begin raise notice '=== ALL SMOKE TESTS PASSED ==='; end $$;
