"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Accepting/rejecting is a plain UPDATE on request_offers — RLS
 * (request_offers_company_update) already scopes this to the company's
 * own offers, and the `trg_handle_offer_acceptance` trigger does the
 * atomic work: creating the job row, moving requests.status forward, and
 * revoking the request's other pending offers so two companies can't both
 * accept the same request. We never touch jobs/requests directly here —
 * that's exactly the "avoid duplicate company acceptance" rule from the
 * workflow spec, enforced in the database, not in this server action.
 */
export async function respondToOffer(
  offerId: string,
  decision: "accepted" | "rejected",
  rejectionReason?: string,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("request_offers")
    .update({
      status: decision,
      rejection_reason: decision === "rejected" ? rejectionReason ?? null : null,
      responded_at: new Date().toISOString(),
    })
    .eq("id", offerId);

  if (error) return { error: error.message };
  revalidatePath("/company/requests");
  revalidatePath("/company");
  return { error: null };
}

export async function assignWorkerToJob(jobId: string, workerId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_worker", {
    p_job_id: jobId,
    p_worker_id: workerId,
  });
  if (error) return { error: error.message };
  revalidatePath("/company/jobs");
  return { error: null };
}

// Note: advancing a job through on_the_way/arrived/in_progress/completed is
// done by the WORKER, not the company — see src/app/worker/actions.ts.
// `advance_job_status` checks `worker_id = my_worker_id()` internally, so
// a company_owner calling it will always get "Not your job". The company
// app's job view is assignment + read-only progress, nothing more.

export async function toggleService(
  companyId: string,
  categoryId: string,
  enabled: boolean,
) {
  const supabase = await createClient();

  if (enabled) {
    const { error } = await supabase
      .from("company_services")
      .insert({ company_id: companyId, category_id: categoryId });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("company_services")
      .delete()
      .eq("company_id", companyId)
      .eq("category_id", categoryId);
    if (error) return { error: error.message };
  }

  revalidatePath("/company/services");
  return { error: null };
}

export async function createSupportTicket(input: {
  companyId: string;
  category: string;
  description: string;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not signed in" };

  const { error } = await supabase.from("support_tickets").insert({
    opened_by: userData.user.id,
    company_id: input.companyId,
    category: input.category,
    description: input.description,
  });
  if (error) return { error: error.message };
  revalidatePath("/company/support");
  return { error: null };
}

export async function respondToReview(reviewId: string, response: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("company_respond_to_review", {
    p_review_id: reviewId,
    p_response: response,
  });
  if (error) return { error: error.message };
  revalidatePath("/company/reviews");
  return { error: null };
}

export async function toggleWorkerSkill(
  workerId: string,
  categoryId: string,
  enabled: boolean,
) {
  const supabase = await createClient();

  if (enabled) {
    const { error } = await supabase
      .from("worker_services")
      .insert({ worker_id: workerId, category_id: categoryId });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("worker_services")
      .delete()
      .eq("worker_id", workerId)
      .eq("category_id", categoryId);
    if (error) return { error: error.message };
  }

  revalidatePath("/company/workers");
  revalidatePath("/company/jobs");
  return { error: null };
}

export async function inviteWorker(input: {
  companyId: string;
  fullName: string;
  invitePhone?: string;
  inviteEmail?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("workers").insert({
    company_id: input.companyId,
    full_name: input.fullName,
    invite_phone: input.invitePhone || null,
    invite_email: input.inviteEmail || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/company/workers");
  return { error: null };
}
