"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const NEXT_STATUS: Record<string, "on_the_way" | "arrived" | "in_progress" | "completed"> = {
  assigned: "on_the_way",
  on_the_way: "arrived",
  arrived: "in_progress",
  in_progress: "completed",
};

/**
 * advance_job_status is SECURITY DEFINER and checks worker_id =
 * my_worker_id() internally — so this only ever succeeds for the worker
 * actually assigned to the job, regardless of what jobId a client sends.
 */
export async function advanceMyJob(jobId: string, currentStatus: string) {
  const next = NEXT_STATUS[currentStatus];
  if (!next) return { error: "No further status to advance to" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("advance_job_status", {
    p_job_id: jobId,
    p_new_status: next,
  });
  if (error) return { error: error.message };
  revalidatePath("/worker");
  return { error: null };
}

/**
 * Direct table UPDATE won't work here: workers_company_rw's WITH CHECK
 * only allows company members to write a workers row, not the worker
 * themselves. set_my_availability() is a narrow SECURITY DEFINER RPC
 * added specifically to close that gap (it only ever touches the row
 * matching auth.uid()).
 */
export async function setAvailability(isAvailable: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_availability", {
    p_is_available: isAvailable,
  });
  if (error) return { error: error.message };
  revalidatePath("/worker");
  return { error: null };
}
