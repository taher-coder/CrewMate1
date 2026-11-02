/**
 * Shared status → label/color mapping. Centralised so "submitted" always
 * reads the same way everywhere, rather than every page inventing its own
 * copy for the same enum value (the enums themselves come straight from
 * the live Supabase schema — see database.types.ts).
 */

export type StatusTone = "neutral" | "info" | "amber" | "success" | "danger";

const REQUEST_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  submitted: { label: "Request submitted", tone: "neutral" },
  finding_companies: { label: "Finding a company", tone: "info" },
  companies_notified: { label: "Companies notified", tone: "info" },
  company_accepted: { label: "Company accepted", tone: "info" },
  worker_assignment_pending: { label: "Arranging a professional", tone: "amber" },
  professional_assigned: { label: "Professional confirmed", tone: "success" },
  no_match: { label: "No company available", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const JOB_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  assigned: { label: "Assigned", tone: "info" },
  on_the_way: { label: "On the way", tone: "info" },
  arrived: { label: "Arrived", tone: "amber" },
  in_progress: { label: "In progress", tone: "amber" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

const OFFER_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  pending: { label: "Pending", tone: "amber" },
  accepted: { label: "Accepted", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  expired: { label: "Expired", tone: "neutral" },
  revoked: { label: "Revoked", tone: "neutral" },
};

const COMPANY_APP_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  applied: { label: "Application submitted", tone: "neutral" },
  under_review: { label: "Under review", tone: "info" },
  info_requested: { label: "Information requested", tone: "amber" },
  verified: { label: "Verified", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger" },
};

const SUPPORT_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  open: { label: "Open", tone: "amber" },
  assigned: { label: "Assigned", tone: "info" },
  investigating: { label: "Investigating", tone: "info" },
  waiting: { label: "Waiting on you", tone: "amber" },
  resolved: { label: "Resolved", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
};

export function requestStatus(status: string) {
  return REQUEST_STATUS[status] ?? { label: status, tone: "neutral" as StatusTone };
}
export function jobStatus(status: string) {
  return JOB_STATUS[status] ?? { label: status, tone: "neutral" as StatusTone };
}
export function offerStatus(status: string) {
  return OFFER_STATUS[status] ?? { label: status, tone: "neutral" as StatusTone };
}
export function companyAppStatus(status: string) {
  return COMPANY_APP_STATUS[status] ?? { label: status, tone: "neutral" as StatusTone };
}
export function supportStatus(status: string) {
  return SUPPORT_STATUS[status] ?? { label: status, tone: "neutral" as StatusTone };
}

export const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-sage text-charcoal",
  info: "bg-info-bg text-info",
  amber: "bg-amber-bg text-amber",
  success: "bg-success-bg text-success",
  danger: "bg-danger-bg text-danger",
};
