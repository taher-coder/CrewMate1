"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface OfferActionState {
  error?: string;
}

// Sec 7.3: accepting advances the real workflow (the DB trigger in
// 0002_state_machines.sql creates the job and flips the request status —
// this action does nothing more than the one legal write). Rejecting
// requires a reason, enforced here in the form, not just suggested.

export async function acceptOffer(_prev: OfferActionState, formData: FormData): Promise<OfferActionState> {
  const offerId = String(formData.get("offer_id"));
  const supabase = await createClient();

  const { error } = await supabase
    .from("request_offers")
    .update({ status: "accepted" })
    .eq("id", offerId)
    .eq("status", "pending");

  if (error) return { error: error.message };

  revalidatePath("/requests");
  revalidatePath("/dashboard");
  return {};
}

export async function rejectOffer(_prev: OfferActionState, formData: FormData): Promise<OfferActionState> {
  const offerId = String(formData.get("offer_id"));
  const reason = String(formData.get("reason") || "").trim();

  if (!reason) {
    return { error: "A reason is required to reject a request." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("request_offers")
    .update({ status: "rejected", rejection_reason: reason })
    .eq("id", offerId)
    .eq("status", "pending");

  if (error) return { error: error.message };

  revalidatePath("/requests");
  revalidatePath("/dashboard");
  return {};
}
