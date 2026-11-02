"use server";

import { createClient } from "@/lib/supabase/server";

export async function acceptWorkerInvite() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_worker_invite");
  if (error) return { error: error.message };
  return { error: null };
}
