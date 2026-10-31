"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface ApplyFormState {
  error?: string;
}

// Sec 6.1/6.2: the application form. Creates the company, makes the
// applicant its owner, then opens the verification application — in that
// order, because RLS's company_applications insert policy requires the
// caller to already be a member of the company it's applying for.
export async function submitApplication(
  _prev: ApplyFormState,
  formData: FormData
): Promise<ApplyFormState> {
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;
  if (!user) return { error: "You must be signed in." };

  const legal_name = String(formData.get("legal_name") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const website = String(formData.get("website") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const years_operation = Number(formData.get("years_operation") || 0) || null;

  if (!legal_name || !city) {
    return { error: "Business name and city are required." };
  }

  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .insert({ legal_name, city, phone, email, website, address, years_operation })
    .select("id")
    .single();

  if (companyErr || !company) {
    return { error: companyErr?.message || "Could not create the company record." };
  }

  const { error: memberErr } = await supabase
    .from("company_members")
    .insert({ company_id: company.id, profile_id: user.id, member_role: "owner" });

  if (memberErr) {
    return { error: memberErr.message };
  }

  const { error: appErr } = await supabase
    .from("company_applications")
    .insert({ company_id: company.id, status: "applied" });

  if (appErr) {
    return { error: appErr.message };
  }

  redirect("/pending");
}
