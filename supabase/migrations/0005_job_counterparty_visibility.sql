-- ============================================================================
-- CrewMate — Job-Counterparty Profile Visibility (Migration 0005)
--
-- Gap found while building the company portal's request/job screens:
-- `profiles` RLS (0003) only let a user read their OWN profile (or admin).
-- That's correct in isolation, but it means a company handling a request
-- had no way to see the CUSTOMER's name/contact (sec 7.3 shows "Customer
-- details" on the request workspace), and a customer had no way to see
-- the WORKER assigned to their job (sec 5.6: "Worker name... Contact
-- options"). `workers` had the same gap from the customer's side.
--
-- Fix: add narrowly-scoped SELECT policies that only grant visibility
-- between people who share an actual job — never a blanket read.
-- ============================================================================

-- A company member or assigned worker may read the PROFILE of the customer
-- on a job they're handling. A customer may read the PROFILE behind the
-- worker assigned to their own job. Nothing wider than that.
create policy profiles_read_job_counterparty on profiles for select
  using (
    exists (
      select 1 from jobs j
      join requests r on r.id = j.request_id
      where (
        (is_company_member(j.company_id) and r.customer_id = profiles.id)
        or (j.worker_id = my_worker_id() and r.customer_id = profiles.id)
        or (
          r.customer_id = auth.uid()
          and exists (select 1 from workers w where w.id = j.worker_id and w.profile_id = profiles.id)
        )
      )
    )
  );

-- A customer may read the basic WORKER row (name, photo, rating) assigned
-- to their own job — sec 5.6 "Professional Assignment". Companies/workers
-- already have their own access via workers_company_rw (migration 0003).
create policy workers_customer_read on workers for select
  using (
    exists (
      select 1 from jobs j
      join requests r on r.id = j.request_id
      where j.worker_id = workers.id and r.customer_id = auth.uid()
    )
  );
