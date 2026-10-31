import { createClient } from "@/lib/supabase/server";
import type { Company, CompanyMember } from "@/lib/types/database";

export interface CompanyContext {
  userId: string;
  company: Company;
  memberRole: CompanyMember["member_role"];
}

/**
 * Resolves the signed-in user's company, if they have one.
 * Returns null if the user has no company_members row yet — the caller
 * decides what that means (usually: send them to /apply).
 *
 * A user could theoretically belong to more than one company (sec 7.5
 * implies a strict 1:1 in practice, but the schema allows staff to be
 * added to a company they didn't found). We take the first membership —
 * multi-company switching is a later feature, not needed for the MVP.
 */
export async function getCompanyContext(): Promise<CompanyContext | null> {
  const supabase = await createClient();

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("company_members")
    .select("member_role, company_id, companies(*)")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error || !data || !data.companies) return null;

  return {
    userId: user.id,
    company: data.companies as unknown as Company,
    memberRole: data.member_role,
  };
}
