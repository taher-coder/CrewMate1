-- ============================================================================
-- CrewMate — Revoke anon EXECUTE on RLS helpers & RPCs (Migration 0007)
--
-- 0006 revoked EXECUTE from PUBLIC, but Supabase's own project-default
-- privileges grant EXECUTE directly to `anon` and `authenticated` on every
-- new function (ALTER DEFAULT PRIVILEGES at the project level) — a grant
-- to a named role, not to PUBLIC, so revoking from PUBLIC alone doesn't
-- touch it. Confirmed via get_advisors still flagging anon access after
-- 0006 was applied to the real project. None of these functions should be
-- reachable by an unauthenticated caller at all (every one either reads
-- auth.uid()-scoped data or is an admin/owner-gated RPC), so anon's
-- EXECUTE is revoked outright here.
--
-- Verified against the real Supabase project (CrewMate1): after this
-- migration, get_advisors shows zero remaining anon-executable findings
-- for any CrewMate function — only PostGIS's own built-in
-- st_estimatedextent (not ours to revoke) remains. The `authenticated`
-- findings that remain are intentional: these RPCs ARE meant to be called
-- by signed-in users, with is_admin()/ownership checks as the real gate.
-- ============================================================================

revoke execute on function auth_role() from anon;
revoke execute on function is_admin() from anon;
revoke execute on function my_company_ids() from anon;
revoke execute on function my_worker_id() from anon;
revoke execute on function is_company_member(uuid) from anon;

revoke execute on function advance_job_status(uuid, job_status, text) from anon;
revoke execute on function assign_worker(uuid, uuid) from anon;
revoke execute on function cancel_request(uuid, text) from anon;
revoke execute on function admin_decide_company_application(uuid, company_app_status, text) from anon;
revoke execute on function admin_set_company_suspension(uuid, boolean, text) from anon;
revoke execute on function company_respond_to_review(uuid, text) from anon;
revoke execute on function admin_moderate_review(uuid, text, text) from anon;
