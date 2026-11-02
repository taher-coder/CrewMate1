import type { createClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/** The signed-in user's company, via company_members. Returns null if the
 * user isn't a member of any company yet (shouldn't happen once the
 * middleware's role gate is doing its job, but keep it defensive). */
export async function getMyCompany(supabase: SupabaseServer) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id, member_role, companies(id, legal_name, display_name, status, commission_rate)")
    .eq("profile_id", userData.user.id)
    .maybeSingle();

  return membership;
}
