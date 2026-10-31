-- ============================================================================
-- CrewMate — Row-Level Security (Migration 0003)
--
-- Enforces sec 13's access boundaries at the database layer:
--   - Customer A cannot see Customer B's bookings
--   - Company A cannot see Company B's workers/jobs
--   - Worker A cannot touch Worker B's jobs
--   - A company cannot change its own verification status
--   - A customer cannot mark their own job as completed
--   - Internal admin/support notes are invisible to customers & companies
--   - Payments/commissions are never writable by end users
-- ============================================================================

-- ----------------------------------------------------------------------------
-- HELPER FUNCTIONS (security definer, so they can read profiles/workers
-- regardless of the calling role's own RLS visibility)
-- ----------------------------------------------------------------------------

create or replace function auth_role() returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function is_admin() returns boolean as $$
  select auth_role() = 'admin';
$$ language sql stable security definer;

create or replace function my_company_ids() returns setof uuid as $$
  select company_id from company_members where profile_id = auth.uid();
$$ language sql stable security definer;

create or replace function my_worker_id() returns uuid as $$
  select id from workers where profile_id = auth.uid();
$$ language sql stable security definer;

create or replace function is_company_member(target_company_id uuid) returns boolean as $$
  select exists (
    select 1 from company_members
    where company_id = target_company_id and profile_id = auth.uid()
  );
$$ language sql stable security definer;

-- ----------------------------------------------------------------------------
-- ENABLE RLS EVERYWHERE
-- ----------------------------------------------------------------------------

alter table profiles enable row level security;
alter table addresses enable row level security;
alter table service_categories enable row level security;
alter table service_problems enable row level security;
alter table companies enable row level security;
alter table company_members enable row level security;
alter table company_applications enable row level security;
alter table company_documents enable row level security;
alter table company_services enable row level security;
alter table company_service_areas enable row level security;
alter table workers enable row level security;
alter table worker_services enable row level security;
alter table requests enable row level security;
alter table request_media enable row level security;
alter table request_offers enable row level security;
alter table jobs enable row level security;
alter table job_status_history enable row level security;
alter table job_completions enable row level security;
alter table quotes enable row level security;
alter table quote_items enable row level security;
alter table payments enable row level security;
alter table commissions enable row level security;
alter table payouts enable row level security;
alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;
alter table message_reads enable row level security;
alter table notifications enable row level security;
alter table reviews enable row level security;
alter table review_moderation_log enable row level security;
alter table support_tickets enable row level security;
alter table support_messages enable row level security;
alter table support_evidence enable row level security;
alter table audit_logs enable row level security;

-- ----------------------------------------------------------------------------
-- PROFILES — everyone can read their own; admin reads all; nobody can
-- change their own `role` (that column is excluded from the update policy's
-- effective write path by application code / a column-level grant).
-- ----------------------------------------------------------------------------

create policy profiles_select_own on profiles for select
  using (id = auth.uid() or is_admin());

create policy profiles_update_own on profiles for update
  using (id = auth.uid() or is_admin());

create policy profiles_insert_self on profiles for insert
  with check (id = auth.uid());

-- ----------------------------------------------------------------------------
-- ADDRESSES — strictly owner-only (plus admin for support investigation)
-- ----------------------------------------------------------------------------

create policy addresses_owner on addresses for all
  using (profile_id = auth.uid() or is_admin())
  with check (profile_id = auth.uid());

-- ----------------------------------------------------------------------------
-- SERVICE CATALOGUE — public read, admin-only write
-- ----------------------------------------------------------------------------

create policy service_categories_read on service_categories for select using (true);
create policy service_categories_admin_write on service_categories for insert with check (is_admin());
create policy service_categories_admin_update on service_categories for update using (is_admin());

create policy service_problems_read on service_problems for select using (true);
create policy service_problems_admin_write on service_problems for insert with check (is_admin());
create policy service_problems_admin_update on service_problems for update using (is_admin());

-- ----------------------------------------------------------------------------
-- COMPANIES — public can read verified companies (for discovery display,
-- e.g. "Company X will handle this"); members read their own company in
-- full; nobody but admin can change `status` (verification state) — sec 13:
-- "a company cannot change its own verification status".
-- ----------------------------------------------------------------------------

create policy companies_read_verified on companies for select
  using (status = 'verified' or is_company_member(id) or is_admin());

create policy companies_member_update on companies for update
  using (is_company_member(id) or is_admin());
  -- NOTE: `status` and `commission_rate` are additionally locked down via a
  -- column-level REVOKE below — see "LOCK DOWN SENSITIVE COLUMNS".

create policy companies_admin_insert on companies for insert
  with check (true); -- creation happens via the application flow (sec 6.1); any authenticated user can start an application

-- ----------------------------------------------------------------------------
-- COMPANY MEMBERS, APPLICATIONS, DOCUMENTS
-- ----------------------------------------------------------------------------

create policy company_members_read on company_members for select
  using (is_company_member(company_id) or is_admin());

create policy company_members_admin_write on company_members for insert
  with check (is_admin() or profile_id = auth.uid()); -- the applicant becomes the first owner

create policy company_applications_read on company_applications for select
  using (is_company_member(company_id) or is_admin());

create policy company_applications_insert on company_applications for insert
  with check (is_company_member(company_id));

-- Only admin may transition application status (sec 6.3: "a controlled decision").
create policy company_applications_admin_update on company_applications for update
  using (is_admin());

create policy company_documents_read on company_documents for select
  using (is_company_member(company_id) or is_admin());

create policy company_documents_company_insert on company_documents for insert
  with check (is_company_member(company_id));

-- Only admin can set a document's review status.
create policy company_documents_admin_update on company_documents for update
  using (is_admin());

-- ----------------------------------------------------------------------------
-- COMPANY SERVICES / SERVICE AREAS — the company configures its own
-- ----------------------------------------------------------------------------

create policy company_services_rw on company_services for all
  using (is_company_member(company_id) or is_admin())
  with check (is_company_member(company_id));

create policy company_service_areas_rw on company_service_areas for all
  using (is_company_member(company_id) or is_admin())
  with check (is_company_member(company_id));

-- ----------------------------------------------------------------------------
-- WORKERS — a company sees/manages only its own workforce; a worker sees
-- only their own row. "Company A cannot access Company B's workers" (sec 13).
-- ----------------------------------------------------------------------------

create policy workers_company_rw on workers for all
  using (is_company_member(company_id) or profile_id = auth.uid() or is_admin())
  with check (is_company_member(company_id));

create policy worker_services_rw on worker_services for all
  using (
    exists (select 1 from workers w where w.id = worker_id and (is_company_member(w.company_id) or is_admin()))
  )
  with check (
    exists (select 1 from workers w where w.id = worker_id and is_company_member(w.company_id))
  );

-- ----------------------------------------------------------------------------
-- REQUESTS — customer sees only their own; companies see requests only via
-- the offers made to them (not all requests in the system); admin sees all.
-- ----------------------------------------------------------------------------

create policy requests_customer_rw on requests for all
  using (
    customer_id = auth.uid()
    or is_admin()
    -- NOTE: `requests.id` is qualified explicitly (not bare `id`) because
    -- request_offers has its own `id` column — an unqualified `id` here
    -- would silently bind to ro.id instead of the outer row, making this
    -- clause vacuously false. (Found via the smoke test; see 0005/test file.)
    or exists (select 1 from request_offers ro where ro.request_id = requests.id and is_company_member(ro.company_id))
  )
  with check (customer_id = auth.uid());

-- Customers can only ever set status to 'cancelled' themselves; every other
-- transition is system-driven via the triggers in migration 0002. Enforced
-- by revoking column-level UPDATE on `status` for the `authenticated` role
-- and instead requiring calls through a SECURITY DEFINER RPC — see
-- supabase/migrations/0004_rpc.sql `cancel_request()`.

create policy request_media_read on request_media for select
  using (
    exists (select 1 from requests r where r.id = request_id and (
      r.customer_id = auth.uid()
      or is_admin()
      or exists (select 1 from request_offers ro where ro.request_id = r.id and is_company_member(ro.company_id))
    ))
  );

create policy request_media_insert on request_media for insert
  with check (exists (select 1 from requests r where r.id = request_id and r.customer_id = auth.uid()));

-- ----------------------------------------------------------------------------
-- REQUEST OFFERS — a company only ever sees offers made TO it, never the
-- full dispatch fan-out to competitors.
-- ----------------------------------------------------------------------------

create policy request_offers_company_read on request_offers for select
  using (is_company_member(company_id) or is_admin());

create policy request_offers_company_update on request_offers for update
  using (is_company_member(company_id))
  with check (is_company_member(company_id));

-- Offer creation (the matching fan-out itself) is a privileged system
-- action, not something any client role should trigger directly.
create policy request_offers_admin_insert on request_offers for insert
  with check (is_admin());

-- ----------------------------------------------------------------------------
-- JOBS — company sees only its own jobs; worker sees only jobs assigned to
-- them; customer sees only the job tied to their own request. "Worker A
-- cannot update Worker B's jobs" / "customer cannot mark their own job
-- completed" (sec 13) — the latter is enforced by NOT granting customers an
-- update policy on jobs at all.
-- ----------------------------------------------------------------------------

create policy jobs_read on jobs for select
  using (
    is_company_member(company_id)
    or worker_id = my_worker_id()
    or is_admin()
    or exists (select 1 from requests r where r.id = request_id and r.customer_id = auth.uid())
  );

-- Company dispatch can assign/reassign workers and cancel.
create policy jobs_company_update on jobs for update
  using (is_company_member(company_id))
  with check (is_company_member(company_id));

-- A worker may advance the status of their OWN job (on_the_way/arrived/
-- in_progress/completed) — but not reassign worker_id or touch another
-- worker's job. Column-level granularity enforced via a SECURITY DEFINER
-- RPC (`advance_job_status`, see 0004_rpc.sql) rather than a raw UPDATE
-- grant, so a worker can change status but never `worker_id` or `company_id`.

create policy jobs_admin_all on jobs for all using (is_admin());

create policy job_status_history_read on job_status_history for select
  using (
    exists (select 1 from jobs j where j.id = job_id and (
      is_company_member(j.company_id) or j.worker_id = my_worker_id() or is_admin()
      or exists (select 1 from requests r where r.id = j.request_id and r.customer_id = auth.uid())
    ))
  );

create policy job_completions_read on job_completions for select
  using (
    exists (select 1 from jobs j where j.id = job_id and (
      is_company_member(j.company_id) or j.worker_id = my_worker_id() or is_admin()
      or exists (select 1 from requests r where r.id = j.request_id and r.customer_id = auth.uid())
    ))
  );

create policy job_completions_worker_insert on job_completions for insert
  with check (
    exists (select 1 from jobs j where j.id = job_id and j.worker_id = my_worker_id())
  );

-- ----------------------------------------------------------------------------
-- QUOTES — visible to the job's company/worker/customer; only company can
-- create/edit; only customer can accept/reject their own quote.
-- ----------------------------------------------------------------------------

create policy quotes_read on quotes for select
  using (
    exists (select 1 from jobs j where j.id = job_id and (
      is_company_member(j.company_id) or j.worker_id = my_worker_id() or is_admin()
      or exists (select 1 from requests r where r.id = j.request_id and r.customer_id = auth.uid())
    ))
  );

create policy quotes_company_insert on quotes for insert
  with check (exists (select 1 from jobs j where j.id = job_id and is_company_member(j.company_id)));

-- Mirrors quotes_read's actual scoping (company/worker/customer on the
-- underlying job) rather than just checking the quote exists at all — the
-- latter would let any authenticated user read any quote's line items.
create policy quote_items_read on quote_items for select
  using (
    exists (
      select 1 from quotes q
      join jobs j on j.id = q.job_id
      where q.id = quote_items.quote_id and (
        is_company_member(j.company_id) or j.worker_id = my_worker_id() or is_admin()
        or exists (select 1 from requests r where r.id = j.request_id and r.customer_id = auth.uid())
      )
    )
  );

-- ----------------------------------------------------------------------------
-- PAYMENTS & COMMISSIONS — read-only for the parties involved; NO insert/
-- update grant for `authenticated` at all. Only `service_role` (the payment
-- webhook handler) can write these (sec 9.9).
-- ----------------------------------------------------------------------------

create policy payments_read on payments for select
  using (
    exists (select 1 from jobs j where j.id = job_id and (
      is_company_member(j.company_id) or is_admin()
      or exists (select 1 from requests r where r.id = j.request_id and r.customer_id = auth.uid())
    ))
  );

create policy commissions_read on commissions for select
  using (is_company_member(company_id) or is_admin());

create policy payouts_read on payouts for select
  using (is_company_member(company_id) or is_admin());

-- (No INSERT/UPDATE policies for payments/commissions/payouts at all —
-- absence of a policy means the table defaults closed for those operations
-- under `authenticated`; only `service_role`, which bypasses RLS, can write.)

-- ----------------------------------------------------------------------------
-- MESSAGING — only conversation participants; internal admin notes
-- (support_messages.is_internal) are filtered separately below.
-- ----------------------------------------------------------------------------

create policy conversation_participants_read on conversation_participants for select
  using (profile_id = auth.uid() or is_admin());

create policy conversations_read on conversations for select
  using (
    exists (select 1 from conversation_participants cp where cp.conversation_id = id and cp.profile_id = auth.uid())
    or is_admin()
  );

-- NOTE: `messages.conversation_id` is qualified explicitly below (not bare
-- `conversation_id`) because conversation_participants ALSO has a
-- conversation_id column — left bare, it silently binds to cp's own
-- column, degrading the check to "are you a participant in ANY
-- conversation", which would leak every conversation's messages to anyone
-- who has ever participated in one. (Found via the smoke test.)

create policy messages_read on messages for select
  using (
    exists (select 1 from conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.profile_id = auth.uid())
    or is_admin()
  );

create policy messages_insert on messages for insert
  with check (
    sender_id = auth.uid()
    and exists (select 1 from conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.profile_id = auth.uid())
  );

create policy message_reads_own on message_reads for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy notifications_own on notifications for select
  using (profile_id = auth.uid() or is_admin());

create policy notifications_own_update on notifications for update
  using (profile_id = auth.uid());

-- ----------------------------------------------------------------------------
-- REVIEWS — public read of visible reviews; customer inserts own (gated
-- further by the trigger in 0002); company can only update `company_response`
-- (enforced via RPC, not raw column grant, to avoid them touching rating).
-- ----------------------------------------------------------------------------

create policy reviews_public_read on reviews for select
  using (moderation_state = 'visible' or is_admin() or is_company_member(company_id)
         or exists (select 1 from jobs j where j.id = job_id and j.worker_id = my_worker_id()));

create policy reviews_customer_insert on reviews for insert
  with check (customer_id = auth.uid());

create policy reviews_admin_moderate on reviews for update
  using (is_admin());

create policy review_moderation_log_admin on review_moderation_log for all using (is_admin());

-- ----------------------------------------------------------------------------
-- SUPPORT TICKETS — visible to the customer/company/worker involved and to
-- admin. Internal notes (support_messages.is_internal = true) are filtered
-- out entirely for non-admin readers (sec 9.10: "internal admin notes must
-- remain private").
-- ----------------------------------------------------------------------------

create policy support_tickets_read on support_tickets for select
  using (
    opened_by = auth.uid()
    or customer_id = auth.uid()
    or (company_id is not null and is_company_member(company_id))
    or (worker_id is not null and worker_id = my_worker_id())
    or is_admin()
  );

create policy support_tickets_insert on support_tickets for insert
  with check (opened_by = auth.uid());

create policy support_tickets_admin_update on support_tickets for update
  using (is_admin());

create policy support_messages_read on support_messages for select
  using (
    is_admin()
    or (
      is_internal = false
      and exists (
        select 1 from support_tickets t where t.id = ticket_id and (
          t.opened_by = auth.uid()
          or t.customer_id = auth.uid()
          or (t.company_id is not null and is_company_member(t.company_id))
          or (t.worker_id is not null and t.worker_id = my_worker_id())
        )
      )
    )
  );

create policy support_messages_insert on support_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from support_tickets t where t.id = ticket_id and (
        t.opened_by = auth.uid() or t.customer_id = auth.uid()
        or (t.company_id is not null and is_company_member(t.company_id))
        or (t.worker_id is not null and t.worker_id = my_worker_id())
        or is_admin()
      )
    )
  );

create policy support_evidence_rw on support_evidence for all
  using (
    is_admin() or exists (
      select 1 from support_tickets t where t.id = ticket_id and (
        t.opened_by = auth.uid() or t.customer_id = auth.uid()
        or (t.company_id is not null and is_company_member(t.company_id))
      )
    )
  )
  with check (uploaded_by = auth.uid());

-- ----------------------------------------------------------------------------
-- AUDIT LOGS — admin read-only; written only by SECURITY DEFINER RPCs /
-- service_role, never directly by any client role.
-- ----------------------------------------------------------------------------

create policy audit_logs_admin_read on audit_logs for select using (is_admin());

-- ----------------------------------------------------------------------------
-- LOCK DOWN SENSITIVE COLUMNS
-- Row-level policies above allow a company to "update" its own companies
-- row (for things like phone/address/website). Column-level REVOKE stops
-- that same policy from being usable to rewrite verification state or
-- platform economics — only service_role (used by admin RPCs) can.
-- ----------------------------------------------------------------------------

revoke update (status, commission_rate, suspended_reason) on companies from authenticated;
revoke update (role) on profiles from authenticated;
revoke update (status, worker_id, company_id) on jobs from authenticated; -- use RPCs instead
revoke update (status) on requests from authenticated; -- use cancel_request() RPC
revoke insert, update on payments from authenticated;
revoke insert, update on commissions from authenticated;
revoke insert, update on payouts from authenticated;
revoke insert, update, delete on audit_logs from authenticated;
