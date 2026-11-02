"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function applyAsCompany(input: {
  legalName: string;
  displayName: string;
  city: string;
  phone: string;
  email: string;
  address: string;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not signed in" };

  if (!input.legalName.trim() || !input.city.trim()) {
    return { error: "Business name and city are required" };
  }

  const { error } = await supabase.rpc("apply_as_company", {
    p_legal_name: input.legalName,
    p_display_name: input.displayName || input.legalName,
    p_city: input.city,
    p_phone: input.phone || undefined,
    p_email: input.email || undefined,
    p_website: undefined,
    p_address: input.address || undefined,
  });

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/become-a-partner");
  redirect("/become-a-partner");
}
