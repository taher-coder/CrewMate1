"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function decideApplication(
  applicationId: string,
  decision: "verified" | "rejected" | "info_requested",
  notes?: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_decide_company_application", {
    p_application_id: applicationId,
    p_decision: decision,
    p_notes: notes,
  });
  if (error) return { error: error.message };
  revalidatePath("/internal-access/companies");
  return { error: null };
}

export async function setCompanySuspension(
  companyId: string,
  suspended: boolean,
  reason?: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_company_suspension", {
    p_company_id: companyId,
    p_suspended: suspended,
    p_reason: reason,
  });
  if (error) return { error: error.message };
  revalidatePath("/internal-access/companies");
  return { error: null };
}

export async function setWorkerStatus(
  workerId: string,
  status: "active" | "inactive" | "removed",
  reason?: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_worker_status", {
    p_worker_id: workerId,
    p_status: status,
    p_reason: reason,
  });
  if (error) return { error: error.message };
  revalidatePath("/internal-access/workers");
  return { error: null };
}

export async function moderateReview(
  reviewId: string,
  action: "hide" | "restore",
  reason?: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_moderate_review", {
    p_review_id: reviewId,
    p_action: action,
    p_reason: reason,
  });
  if (error) return { error: error.message };
  revalidatePath("/internal-access/reviews");
  return { error: null };
}

export async function updateSupportTicketStatus(
  ticketId: string,
  status: "assigned" | "investigating" | "waiting" | "resolved" | "closed",
) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("support_tickets")
    .update({
      status,
      assigned_admin_id: userData.user?.id,
      resolved_at: status === "resolved" ? new Date().toISOString() : undefined,
      closed_at: status === "closed" ? new Date().toISOString() : undefined,
    })
    .eq("id", ticketId);
  if (error) return { error: error.message };
  revalidatePath("/internal-access/support");
  return { error: null };
}
