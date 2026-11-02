"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function cancelBooking(requestId: string, reason?: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_request", {
    p_request_id: requestId,
    p_reason: reason,
  });
  if (error) return { error: error.message };
  revalidatePath(`/bookings/${requestId}`);
  revalidatePath("/bookings");
  return { error: null };
}
