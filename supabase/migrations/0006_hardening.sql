-- ============================================================================
-- CrewMate — Security Hardening (Migration 0006)
--
-- Findings from Supabase's own database linter (get_advisors) after
-- applying 0001-0005 to a real project — not hypothetical:
--
-- 1. All 24 functions had a mutable search_path. For a SECURITY DEFINER
--    function this is a real privilege-escalation vector: a caller who can
--    create objects in a schema earlier in their search_path can shadow a
--    table/function the definer function references, making it run
--    attacker-controlled code with the definer's privileges. Fixed by
--    pinning `SET search_path = public, pg_temp` on every function.
-- 2. Every RPC (including admin-only ones) was callable by the `anon` role
--    — Postgres grants EXECUTE to PUBLIC by default on function creation,
--    and the original migrations never revoked it. The internal is_admin()/
--    ownership checks still protected the data, but there's no reason an
--    unauthenticated caller should reach these endpoints at all. Fixed by
--    revoking from PUBLIC and granting back only to `authenticated`.
-- 3. PostGIS's own `spatial_ref_sys` table (created by `create extension
--    postgis`) has no RLS. It's static, non-sensitive reference data (SRID
--    definitions), but the linter flags any public table without RLS as
--    ERROR-level. NOT fixed here: the table is owned by the extension/
--    superuser, so `alter table spatial_ref_sys enable row level security`
--    fails with "must be owner of table" when run as the migration role —
--    confirmed against the real project, not assumed. This is Supabase's
--    documented default behavior for any project with PostGIS installed in
--    the public schema; the accepted fix is either leaving it (it holds no
--    tenant data — just EPSG/SRID reference rows) or moving postgis to a
--    dedicated schema at project setup, which is a larger change than
--    patching in afterward. Flagged here rather than silently dropped.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Pin search_path on every function
-- ----------------------------------------------------------------------------

alter function fn_validate_job_transition() set search_path = public, pg_temp;
alter function fn_log_job_status_history() set search_path = public, pg_temp;
alter function fn_validate_job_completion() set search_path = public, pg_temp;
alter function fn_validate_worker_assignment() set search_path = public, pg_temp;
alter function fn_handle_offer_created() set search_path = public, pg_temp;
alter function fn_handle_offer_acceptance() set search_path = public, pg_temp;
alter function fn_handle_worker_assigned() set search_path = public, pg_temp;
alter function fn_validate_request_transition() set search_path = public, pg_temp;
alter function fn_validate_company_app_transition() set search_path = public, pg_temp;
alter function fn_sync_company_status() set search_path = public, pg_temp;
alter function fn_validate_support_transition() set search_path = public, pg_temp;
alter function fn_validate_review_eligibility() set search_path = public, pg_temp;

alter function auth_role() set search_path = public, pg_temp;
alter function is_admin() set search_path = public, pg_temp;
alter function my_company_ids() set search_path = public, pg_temp;
alter function my_worker_id() set search_path = public, pg_temp;
alter function is_company_member(uuid) set search_path = public, pg_temp;

alter function advance_job_status(uuid, job_status, text) set search_path = public, pg_temp;
alter function assign_worker(uuid, uuid) set search_path = public, pg_temp;
alter function cancel_request(uuid, text) set search_path = public, pg_temp;
alter function admin_decide_company_application(uuid, company_app_status, text) set search_path = public, pg_temp;
alter function admin_set_company_suspension(uuid, boolean, text) set search_path = public, pg_temp;
alter function company_respond_to_review(uuid, text) set search_path = public, pg_temp;
alter function admin_moderate_review(uuid, text, text) set search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- 2. Lock EXECUTE down to `authenticated` only — remove PUBLIC/anon access
--    on every RLS helper and RPC. (Trigger functions aren't directly
--    callable via PostgREST and don't need this, but helper/RPC functions do.)
-- ----------------------------------------------------------------------------

revoke execute on function auth_role() from public;
revoke execute on function is_admin() from public;
revoke execute on function my_company_ids() from public;
revoke execute on function my_worker_id() from public;
revoke execute on function is_company_member(uuid) from public;
grant execute on function auth_role() to authenticated;
grant execute on function is_admin() to authenticated;
grant execute on function my_company_ids() to authenticated;
grant execute on function my_worker_id() to authenticated;
grant execute on function is_company_member(uuid) to authenticated;

revoke execute on function advance_job_status(uuid, job_status, text) from public;
revoke execute on function assign_worker(uuid, uuid) from public;
revoke execute on function cancel_request(uuid, text) from public;
revoke execute on function admin_decide_company_application(uuid, company_app_status, text) from public;
revoke execute on function admin_set_company_suspension(uuid, boolean, text) from public;
revoke execute on function company_respond_to_review(uuid, text) from public;
revoke execute on function admin_moderate_review(uuid, text, text) from public;

grant execute on function advance_job_status(uuid, job_status, text) to authenticated;
grant execute on function assign_worker(uuid, uuid) to authenticated;
grant execute on function cancel_request(uuid, text) to authenticated;
grant execute on function admin_decide_company_application(uuid, company_app_status, text) to authenticated;
grant execute on function admin_set_company_suspension(uuid, boolean, text) to authenticated;
grant execute on function company_respond_to_review(uuid, text) to authenticated;
grant execute on function admin_moderate_review(uuid, text, text) to authenticated;

-- spatial_ref_sys RLS is NOT applied here — see the note above section 3.
-- Confirmed against the real project: this statement fails with "must be
-- owner of table spatial_ref_sys" under the migration role.
--   alter table spatial_ref_sys enable row level security;
--   create policy spatial_ref_sys_public_read on spatial_ref_sys for select using (true);
