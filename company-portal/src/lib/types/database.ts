// Hand-written to match supabase/migrations/0001-0004 exactly (see the
// crewmate backend repo). Regenerate with `supabase gen types typescript`
// once the project is linked, and diff against this to catch drift.

export type UserRole = "customer" | "company_owner" | "company_staff" | "worker" | "admin";
export type CompanyAppStatus = "applied" | "under_review" | "info_requested" | "verified" | "rejected" | "suspended";
export type DocumentStatus = "pending" | "approved" | "rejected" | "expired" | "missing";
export type WorkerAccountStatus = "invited" | "active" | "inactive" | "removed";
export type RequestTimeType = "asap" | "scheduled";
export type RequestStatus =
  | "submitted" | "finding_companies" | "companies_notified" | "company_accepted"
  | "worker_assignment_pending" | "professional_assigned" | "no_match" | "cancelled";
export type OfferStatus = "pending" | "accepted" | "rejected" | "expired" | "revoked";
export type JobStatus = "assigned" | "on_the_way" | "arrived" | "in_progress" | "completed" | "cancelled";
export type ReviewModerationState = "visible" | "flagged" | "hidden";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  legal_name: string;
  display_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string;
  years_operation: number | null;
  status: CompanyAppStatus;
  commission_rate: number;
  suspended_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyMember {
  company_id: string;
  profile_id: string;
  member_role: "owner" | "staff";
  created_at: string;
}

export interface CompanyApplication {
  id: string;
  company_id: string;
  status: CompanyAppStatus;
  info_requested_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface CompanyDocument {
  id: string;
  company_id: string;
  document_type: string;
  file_path: string;
  status: DocumentStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface ServiceProblem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface CompanyService {
  company_id: string;
  category_id: string;
  created_at: string;
}

export interface CompanyServiceArea {
  id: string;
  company_id: string;
  city: string;
  center: string; // geography point, returned as WKT/GeoJSON by postgrest
  radius_km: number;
  created_at: string;
}

export interface Worker {
  id: string;
  company_id: string;
  profile_id: string | null;
  invite_phone: string | null;
  invite_email: string | null;
  full_name: string;
  status: WorkerAccountStatus;
  is_available: boolean;
  rating_avg: number | null;
  rating_count: number;
  invited_at: string;
  activated_at: string | null;
  deactivated_at: string | null;
}

export interface WorkerService {
  worker_id: string;
  category_id: string;
}

export interface Address {
  id: string;
  profile_id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postal_code: string | null;
  location: string | null;
  is_default: boolean;
  created_at: string;
}

export interface ServiceRequest {
  id: string;
  customer_id: string;
  category_id: string;
  problem_id: string | null;
  description: string | null;
  address_id: string;
  location: string;
  time_type: RequestTimeType;
  scheduled_at: string | null;
  status: RequestStatus;
  no_match_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestOffer {
  id: string;
  request_id: string;
  company_id: string;
  status: OfferStatus;
  rejection_reason: string | null;
  responded_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  request_id: string;
  company_id: string;
  worker_id: string | null;
  status: JobStatus;
  assigned_at: string;
  on_the_way_at: string | null;
  arrived_at: string | null;
  in_progress_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
}

export interface JobStatusHistory {
  id: string;
  job_id: string;
  status: JobStatus;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  job_id: string;
  customer_id: string;
  company_id: string;
  worker_id: string | null;
  rating: number;
  comment: string | null;
  company_response: string | null;
  moderation_state: ReviewModerationState;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  opened_by: string;
  customer_id: string | null;
  company_id: string | null;
  worker_id: string | null;
  job_id: string | null;
  request_id: string | null;
  category: string;
  description: string;
  status: "open" | "assigned" | "investigating" | "waiting" | "resolved" | "closed";
  assigned_admin_id: string | null;
  created_at: string;
  resolved_at: string | null;
  closed_at: string | null;
}

// ---------------------------------------------------------------------------
// Minimal Supabase generic Database shape — enough for the typed client to
// resolve table names and RPC signatures used by this app.
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      companies: { Row: Company; Insert: Partial<Company>; Update: Partial<Company> };
      company_members: { Row: CompanyMember; Insert: Partial<CompanyMember>; Update: Partial<CompanyMember> };
      company_applications: { Row: CompanyApplication; Insert: Partial<CompanyApplication>; Update: Partial<CompanyApplication> };
      company_documents: { Row: CompanyDocument; Insert: Partial<CompanyDocument>; Update: Partial<CompanyDocument> };
      service_categories: { Row: ServiceCategory; Insert: Partial<ServiceCategory>; Update: Partial<ServiceCategory> };
      service_problems: { Row: ServiceProblem; Insert: Partial<ServiceProblem>; Update: Partial<ServiceProblem> };
      company_services: { Row: CompanyService; Insert: Partial<CompanyService>; Update: Partial<CompanyService> };
      company_service_areas: { Row: CompanyServiceArea; Insert: Partial<CompanyServiceArea>; Update: Partial<CompanyServiceArea> };
      workers: { Row: Worker; Insert: Partial<Worker>; Update: Partial<Worker> };
      worker_services: { Row: WorkerService; Insert: Partial<WorkerService>; Update: Partial<WorkerService> };
      addresses: { Row: Address; Insert: Partial<Address>; Update: Partial<Address> };
      requests: { Row: ServiceRequest; Insert: Partial<ServiceRequest>; Update: Partial<ServiceRequest> };
      request_offers: { Row: RequestOffer; Insert: Partial<RequestOffer>; Update: Partial<RequestOffer> };
      jobs: { Row: Job; Insert: Partial<Job>; Update: Partial<Job> };
      job_status_history: { Row: JobStatusHistory; Insert: Partial<JobStatusHistory>; Update: Partial<JobStatusHistory> };
      reviews: { Row: Review; Insert: Partial<Review>; Update: Partial<Review> };
      support_tickets: { Row: SupportTicket; Insert: Partial<SupportTicket>; Update: Partial<SupportTicket> };
    };
    Functions: {
      assign_worker: { Args: { p_job_id: string; p_worker_id: string | null }; Returns: Job };
      cancel_request: { Args: { p_request_id: string; p_reason?: string | null }; Returns: ServiceRequest };
      company_respond_to_review: { Args: { p_review_id: string; p_response: string }; Returns: Review };
    };
  };
}
