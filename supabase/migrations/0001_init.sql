-- ============================================================================
-- CrewMate — Core Schema (Migration 0001)
-- Postgres / Supabase
--
-- Covers: roles & profiles, companies & verification, workers, services &
-- coverage, requests & matching offers, jobs & lifecycle, quotes & payments
-- & commissions, messaging & notifications, reviews, support, audit log.
--
-- Design principles followed from the CrewMate blueprint:
--   - Every state transition is constrained, not freeform (sec 8.6, 10, 6.3, 9.10)
--   - Money/verification facts are server-side records, never client-asserted
--   - RLS (migration 0002) enforces the access boundaries from sec 13
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "postgis"; -- for lat/lng + coverage-area geometry

-- ----------------------------------------------------------------------------
-- ENUM TYPES
-- ----------------------------------------------------------------------------

create type user_role as enum ('customer', 'company_owner', 'company_staff', 'worker', 'admin');

create type company_app_status as enum (
  'applied', 'under_review', 'info_requested', 'verified', 'rejected', 'suspended'
);

create type document_status as enum ('pending', 'approved', 'rejected', 'expired', 'missing');

create type worker_account_status as enum ('invited', 'active', 'inactive', 'removed');

create type request_time_type as enum ('asap', 'scheduled');

-- Matching/request lifecycle as seen by the customer (sec 5.5)
create type request_status as enum (
  'submitted',
  'finding_companies',
  'companies_notified',
  'company_accepted',
  'worker_assignment_pending',
  'professional_assigned',
  'no_match',
  'cancelled'
);

create type offer_status as enum ('pending', 'accepted', 'rejected', 'expired', 'revoked');

-- Job lifecycle (sec 8.6) — the worker-facing truth of a job's progress
create type job_status as enum (
  'assigned', 'on_the_way', 'arrived', 'in_progress', 'completed', 'cancelled'
);

create type quote_status as enum ('pending', 'accepted', 'rejected', 'expired');

create type payment_status as enum ('pending', 'authorized', 'captured', 'failed', 'refunded');

create type payout_status as enum ('pending', 'processing', 'paid', 'failed');

create type review_moderation_state as enum ('visible', 'flagged', 'hidden');

create type support_status as enum (
  'open', 'assigned', 'investigating', 'waiting', 'resolved', 'closed'
);

create type notification_channel as enum ('in_app', 'email', 'sms', 'push');

-- ----------------------------------------------------------------------------
-- IDENTITY
-- ----------------------------------------------------------------------------

-- One row per auth.users row. Role is assigned server-side, never
-- self-selected at signup (sec 5.1 — "no public selection of role").
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  full_name text,
  phone text unique,
  email text unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  label text,                      -- "Home", "Office"
  line1 text not null,
  line2 text,
  city text not null,
  state text,
  postal_code text,
  location geography(Point, 4326), -- lng/lat
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index addresses_profile_idx on addresses(profile_id);
create index addresses_location_idx on addresses using gist(location);

-- ----------------------------------------------------------------------------
-- SERVICE CATALOGUE
-- ----------------------------------------------------------------------------

create table service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,        -- "Plumbing", "Electrical", "AC Repair"
  slug text not null unique,
  description text,
  icon_url text,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table service_problems (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references service_categories(id) on delete cascade,
  name text not null,               -- "Leaking tap", "Drain blockage"
  description text,
  is_active boolean not null default true
);
create index service_problems_category_idx on service_problems(category_id);

-- ----------------------------------------------------------------------------
-- COMPANIES & VERIFICATION (sec 6)
-- ----------------------------------------------------------------------------

create table companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text,
  phone text,
  email text,
  website text,
  address text,
  city text not null,
  years_operation int,
  status company_app_status not null default 'applied',
  commission_rate numeric(5,2) not null default 15.00, -- % — admin-controlled, sec 7.13
  suspended_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Links a profile to a company with an internal role. The owner is the
-- profile that submitted the application; staff can be added later.
create table company_members (
  company_id uuid not null references companies(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  member_role text not null default 'owner' check (member_role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  primary key (company_id, profile_id)
);

create table company_applications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  status company_app_status not null default 'applied',
  info_requested_notes text,        -- what the admin asked for (sec 6.3)
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index company_applications_company_idx on company_applications(company_id);

create table company_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  document_type text not null,      -- 'business_registration','pan','gst','address_proof', etc.
  file_path text not null,          -- private storage path
  status document_status not null default 'pending',
  rejection_reason text,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index company_documents_company_idx on company_documents(company_id);

create table company_services (
  company_id uuid not null references companies(id) on delete cascade,
  category_id uuid not null references service_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (company_id, category_id)
);

create table company_service_areas (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  city text not null,
  center geography(Point, 4326) not null,
  radius_km numeric(6,2) not null default 10,
  created_at timestamptz not null default now()
);
create index company_service_areas_company_idx on company_service_areas(company_id);
create index company_service_areas_center_idx on company_service_areas using gist(center);

-- ----------------------------------------------------------------------------
-- WORKERS (sec 7.5, 8.1) — invited by company, never self-registered
-- ----------------------------------------------------------------------------

create table workers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null, -- null until invite accepted
  invite_phone text,         -- how the invite was sent, before profile exists
  invite_email text,
  full_name text not null,
  status worker_account_status not null default 'invited',
  is_available boolean not null default false, -- live availability toggle
  rating_avg numeric(3,2),
  rating_count int not null default 0,
  invited_at timestamptz not null default now(),
  activated_at timestamptz,
  deactivated_at timestamptz
);
create index workers_company_idx on workers(company_id);
create index workers_profile_idx on workers(profile_id);

create table worker_services (
  worker_id uuid not null references workers(id) on delete cascade,
  category_id uuid not null references service_categories(id) on delete cascade,
  primary key (worker_id, category_id)
);

-- ----------------------------------------------------------------------------
-- REQUESTS & MATCHING (sec 5.4, 5.5, 10)
-- ----------------------------------------------------------------------------

create table requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id),
  category_id uuid not null references service_categories(id),
  problem_id uuid references service_problems(id),
  description text,
  address_id uuid not null references addresses(id),
  location geography(Point, 4326) not null, -- snapshot at submit time
  time_type request_time_type not null default 'asap',
  scheduled_at timestamptz,
  status request_status not null default 'submitted',
  no_match_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scheduled_requires_time check (
    (time_type = 'asap') or (time_type = 'scheduled' and scheduled_at is not null)
  )
);
create index requests_customer_idx on requests(customer_id);
create index requests_status_idx on requests(status);
create index requests_location_idx on requests using gist(location);

create table request_media (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  file_path text not null,
  media_type text not null check (media_type in ('photo', 'video')),
  created_at timestamptz not null default now()
);

-- One row per company that was offered a request (sec 10.2). This is the
-- audit trail of "who was asked, who said yes" that admin dispatch relies on.
create table request_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests(id) on delete cascade,
  company_id uuid not null references companies(id),
  status offer_status not null default 'pending',
  rejection_reason text,
  responded_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (request_id, company_id)
);
create index request_offers_request_idx on request_offers(request_id);
create index request_offers_company_idx on request_offers(company_id, status);

-- ----------------------------------------------------------------------------
-- JOBS & LIFECYCLE (sec 7.8, 8.4–8.7)
-- ----------------------------------------------------------------------------

-- A job exists once a company accepts a request. One request -> one job
-- (a rejected/re-matched request simply gets new offers, not a new job).
create table jobs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references requests(id),
  company_id uuid not null references companies(id),
  worker_id uuid references workers(id), -- null until dispatch assigns someone
  status job_status not null default 'assigned',
  assigned_at timestamptz not null default now(),
  on_the_way_at timestamptz,
  arrived_at timestamptz,
  in_progress_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now()
);
create index jobs_company_idx on jobs(company_id, status);
create index jobs_worker_idx on jobs(worker_id, status);

-- Append-only audit of every status change — who, when, notes (sec 8.6).
create table job_status_history (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  status job_status not null,
  changed_by uuid references profiles(id),
  notes text,
  created_at timestamptz not null default now()
);
create index job_status_history_job_idx on job_status_history(job_id);

create table job_completions (
  job_id uuid primary key references jobs(id) on delete cascade,
  notes text,
  photo_paths text[] default '{}',
  completed_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- PRICING, PAYMENTS, COMMISSIONS (sec 12)
-- ----------------------------------------------------------------------------

create table quotes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  amount numeric(10,2) not null,
  status quote_status not null default 'pending',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create table quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  description text not null,
  amount numeric(10,2) not null
);

-- Only ever written by a server-side payment-provider webhook/handler —
-- never set directly by client code (sec 9.9: "must not pretend to have
-- collected money").
create table payments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id),
  amount numeric(10,2) not null,
  status payment_status not null default 'pending',
  provider text not null default 'razorpay',
  provider_ref text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_job_idx on payments(job_id);

create table commissions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id),
  company_id uuid not null references companies(id),
  rate numeric(5,2) not null,
  amount numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create table payouts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  amount numeric(10,2) not null,
  status payout_status not null default 'pending',
  period_start date not null,
  period_end date not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- MESSAGING & NOTIFICATIONS (sec 11)
-- ----------------------------------------------------------------------------

create table conversations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id),
  support_ticket_id uuid, -- fk added after support_tickets is created
  created_at timestamptz not null default now()
);

create table conversation_participants (
  conversation_id uuid not null references conversations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  primary key (conversation_id, profile_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on messages(conversation_id, created_at);

create table message_reads (
  message_id uuid not null references messages(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, profile_id)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type text not null,            -- 'new_request','worker_assigned','job_completed',...
  channel notification_channel not null default 'in_app',
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_profile_idx on notifications(profile_id, read_at);

-- ----------------------------------------------------------------------------
-- REVIEWS (sec 5.10, 9.11)
-- ----------------------------------------------------------------------------

create table reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references jobs(id),
  customer_id uuid not null references profiles(id),
  company_id uuid not null references companies(id),
  worker_id uuid references workers(id),
  rating int not null check (rating between 1 and 5),
  comment text,
  company_response text,
  moderation_state review_moderation_state not null default 'visible',
  created_at timestamptz not null default now()
);
create index reviews_company_idx on reviews(company_id);
create index reviews_worker_idx on reviews(worker_id);

create table review_moderation_log (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  admin_id uuid not null references profiles(id),
  action text not null check (action in ('flag', 'investigate', 'hide', 'restore')),
  reason text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- SUPPORT (sec 5.11, 9.10)
-- ----------------------------------------------------------------------------

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  opened_by uuid not null references profiles(id),
  customer_id uuid references profiles(id),
  company_id uuid references companies(id),
  worker_id uuid references workers(id),
  job_id uuid references jobs(id),
  request_id uuid references requests(id),
  category text not null,
  description text not null,
  status support_status not null default 'open',
  assigned_admin_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  closed_at timestamptz
);
create index support_tickets_status_idx on support_tickets(status);

alter table conversations
  add constraint conversations_support_ticket_fk
  foreign key (support_ticket_id) references support_tickets(id);

create table support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  sender_id uuid references profiles(id), -- null for system messages
  body text not null,
  is_internal boolean not null default false, -- admin-only notes (sec 9.10)
  created_at timestamptz not null default now()
);
create index support_messages_ticket_idx on support_messages(ticket_id);

create table support_evidence (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  file_path text not null,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- AUDIT LOG (sec 9.3, 9.6: "every consequential action requires an audit record")
-- ----------------------------------------------------------------------------

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,           -- 'company.approve','job.reassign','review.hide',...
  entity_type text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on audit_logs(entity_type, entity_id);
create index audit_logs_actor_idx on audit_logs(actor_id);
