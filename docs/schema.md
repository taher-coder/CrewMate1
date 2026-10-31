# CrewMate — Database Schema & Backend Logic

This covers `supabase/migrations/0001`–`0004`: the full data model, the
state-machine enforcement, and the access-control layer, for the backend
described in sections 13–15 of the blueprint. It has been validated by
actually running the migrations against a real Postgres 16 + PostGIS
database and exercising the business logic (see "Verification" below) —
this isn't just syntax that compiles, the rules actually hold.

## Entity map

```
profiles (1 per auth.users row, role-tagged)
 ├─ addresses
 ├─ companies ←── company_members ──→ profiles (owner/staff)
 │    ├─ company_applications (verification workflow)
 │    ├─ company_documents
 │    ├─ company_services ──→ service_categories
 │    └─ company_service_areas (geo coverage)
 │         └─ workers ──→ worker_services ──→ service_categories
 │
 ├─ requests (customer's service request)
 │    ├─ request_media
 │    ├─ request_offers ──→ companies (one row per company offered the job)
 │    └─ jobs (created the moment an offer is accepted)
 │         ├─ job_status_history (append-only audit trail)
 │         ├─ job_completions
 │         ├─ quotes ──→ quote_items
 │         ├─ payments ──→ commissions
 │         └─ reviews ──→ review_moderation_log
 │
 ├─ conversations ──→ conversation_participants, messages, message_reads
 ├─ notifications
 └─ support_tickets ──→ support_messages, support_evidence

audit_logs — every admin/privileged action, independent of the above tree
```

## Why it's split into four migrations

1. **`0001_init.sql`** — tables, enums, indexes only. No business rules yet.
2. **`0002_state_machines.sql`** — trigger functions that make illegal state
   transitions *impossible*, not just discouraged:
   - Job lifecycle: `assigned → on_the_way → arrived → in_progress → completed`,
     cancellable from any non-terminal state, nothing moves after
     `completed`/`cancelled`. No step can be skipped (blueprint sec 8.6).
   - Request lifecycle mirrors what the customer app shows (sec 5.5) and can
     *only* reach `company_accepted` / `professional_assigned` through the
     offer-acceptance and worker-assignment triggers — never a direct write.
     This is the literal implementation of "CrewMate must never pretend a
     company accepted a request when no company has actually accepted it."
   - Worker assignment is validated against company membership, active
     status, and service eligibility before it's allowed to stick (sec 7.4).
   - Company application workflow, support ticket workflow, and review
     eligibility ("only the customer who completed this job may review it")
     are all enforced the same way.
3. **`0003_rls.sql`** — Row-Level Security so the rules in sec 13 hold *even
   if the frontend has a bug*: a customer physically cannot `SELECT` another
   customer's request; a company cannot see another company's workers; a
   worker cannot see another worker's jobs. Sensitive columns
   (`companies.status`, `jobs.worker_id`, `requests.status`, `profiles.role`,
   all of `payments`/`commissions`/`payouts`) are additionally `REVOKE`d from
   the `authenticated` role entirely — there is no RLS policy generous
   enough to leak around a `REVOKE`.
4. **`0004_rpcs.sql`** — because step 3 revokes direct writes to those
   columns, this adds the only legitimate doors back in: `advance_job_status`
   (worker), `assign_worker` (company dispatch), `cancel_request` (customer),
   `admin_decide_company_application`, `admin_set_company_suspension`,
   `company_respond_to_review`, `admin_moderate_review`. Each one checks the
   caller's actual relationship to the row before doing anything, and the
   admin ones write to `audit_logs` automatically.

## Key design decisions worth knowing about

- **Money is never client-asserted.** `payments`, `commissions`, and
  `payouts` have no `INSERT`/`UPDATE` grant for the `authenticated` role at
  all — only `service_role` (used by a server-side Razorpay webhook handler
  you'll add later) can write them. Until that integration exists, these
  tables are simply empty, which is the honest behavior sec 9.9 asks for.
- **Workers never self-register.** `workers.profile_id` is nullable — a row
  is created by the company (with `invite_phone`/`invite_email`) before the
  person has even signed up, and gets linked once they accept the invite.
- **`request_offers` is the dispatch audit trail.** It's what lets admin see
  "which companies were asked, who said yes" (sec 9.5) and is also what
  keeps a company from seeing requests it was never offered — a company's
  visibility into `requests` is entirely mediated through its own offers.
- **Geography uses PostGIS** (`geography(Point, 4326)` columns +
  `company_service_areas.radius_km`) so "is this request inside this
  company's coverage" is a real spatial query, not string matching on city
  names. Supabase has PostGIS available as a toggleable extension.
- **Audit logging is automatic for privileged actions**, not something the
  app has to remember to call separately — it happens inside the RPCs
  themselves.

## What's deliberately NOT in this migration

- **Matching/ranking algorithm** — `request_offers` rows are currently
  inserted by an admin-only policy, i.e. by a server-side matching service
  you'll write (reads `company_service_areas` + `company_services` +
  company verification status to decide who gets offered a request). The
  schema supports it; the ranking logic itself is an application concern,
  not a database constraint.
- **Payment capture flow** — tables exist; the Razorpay webhook handler that
  writes to them is a separate piece (Edge Function recommended).
- **Notification dispatch** (SMS/email/push sending) — the `notifications`
  table records *that* something should notify someone; actually sending
  via Twilio/Resend is application code, not a DB concern.
- **Full-text/geo search tuning, pagination, caching** — this is the
  correctness layer; performance tuning comes once there's real data volume.

## Verification

Before calling this done, the full migration set was run against a real
**Postgres 16 + PostGIS 3.4** instance (not just syntax-checked) and put
through a scripted end-to-end test (`supabase/test/smoke_test.sql`) that
plays out: a customer submits a request → gets offered to a company → the
company accepts (job auto-created) → assigns a worker (validated) → the
worker tries to illegally skip a lifecycle step (rejected) → completes the
job correctly through all steps → the job is confirmed terminal (no further
moves accepted) → the customer reviews it → a *different* customer's attempt
to review the same job is rejected → RLS is confirmed to hide another
customer's request from a non-owner and show it to its owner.

All 17 assertions pass (9 from the original backend build, 8 added since
while building the company portal against this schema for real). Bugs
caught and fixed in this process:

- The request state machine had no path for `submitted → company_accepted`
  because nothing was explicitly advancing it through `companies_notified`
  when offers went out — fixed by having offer-creation itself drive that
  transition (`0002_state_machines.sql`), matching sec 10.2.
- `profiles` and `workers` RLS only let a user see their *own* row (or
  admin) — meaning a company had no way to see a customer's name on a
  request, and a customer had no way to see the worker assigned to their
  job. Fixed with narrowly-scoped "shared job" visibility policies
  (`0005_job_counterparty_visibility.sql`).
- **Two ambiguous-column bugs in `0003_rls.sql`'s correlated subqueries.**
  `requests_customer_rw`'s company-visibility clause compared
  `request_offers.id` to itself instead of the outer request's id (an
  unqualified `id` bound to the nearer table), silently making that branch
  always false. Worse: `messages_read`/`messages_insert` had the same
  pattern on `conversation_id` — which degraded the check to "are you a
  participant in *any* conversation", a platform-wide message leak between
  unrelated conversations. A third policy, `quote_items_read`, only checked
  that a quote existed at all, not that the caller had any relationship to
  it. All three are fixed in `0003_rls.sql` directly (not patched on top,
  since nothing had been deployed yet), and the smoke test now specifically
  constructs an unrelated conversation/quote to prove the leak is closed,
  not just that the happy path works.

`supabase/test/stub_supabase.sql` recreates just enough of Supabase's
`auth` schema to test migrations on vanilla Postgres; it is not part of the
real migration set and should not be run against an actual Supabase project
(which already provides all of it).

## Running this for real

```bash
# Against a real Supabase project (recommended path):
supabase link --project-ref <your-project-ref>
supabase db push        # applies 0001 → 0004 in order

# Or via psql directly against any Postgres 15+ with postgis available:
psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
psql "$DATABASE_URL" -f supabase/migrations/0002_state_machines.sql
psql "$DATABASE_URL" -f supabase/migrations/0003_rls.sql
psql "$DATABASE_URL" -f supabase/migrations/0004_rpcs.sql
```

After this, Supabase Auth creates `auth.users` rows on signup; you'll want
a trigger (`on_auth_user_created`) that inserts the matching `profiles` row
— not included here since the default `role` and onboarding flow is a
product decision (sec 5.1: customers always default to `customer`; company
owner / worker / admin roles get assigned by the application flow, never
self-selected).

## Next steps (not yet built)

1. `on_auth_user_created` trigger → auto-create `profiles` row on signup.
2. Matching service: given a new `request`, insert `request_offers` rows for
   eligible companies (verified, service-enabled, coverage includes the
   request's location) — this is what actually drives `fn_handle_offer_created`.
3. Razorpay webhook handler (Edge Function, `service_role`) writing to
   `payments`/`commissions`.
4. Notification dispatch worker reading `notifications` and sending via
   Twilio (SMS/OTP) and Resend (email).
5. Next.js API routes / server actions for each of the four apps, calling
   into this schema through Supabase's generated client + the RPCs above.
