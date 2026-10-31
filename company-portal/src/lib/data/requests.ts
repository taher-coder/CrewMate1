import { createClient } from "@/lib/supabase/server";

export async function getOffers(companyId: string, status?: "pending" | "accepted" | "rejected") {
  const supabase = await createClient();
  let query = supabase
    .from("request_offers")
    .select(
      `id, status, created_at, responded_at, expires_at, rejection_reason,
       requests (
         id, description, time_type, scheduled_at, status, location, created_at,
         service_categories (name),
         service_problems (name),
         addresses (line1, line2, city, postal_code)
       )`
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getOfferDetail(offerId: string, companyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("request_offers")
    .select(
      `id, status, created_at, responded_at, expires_at, rejection_reason, company_id,
       requests (
         id, description, time_type, scheduled_at, status, created_at, customer_id,
         service_categories (name),
         service_problems (name),
         addresses (line1, line2, city, state, postal_code),
         request_media (id, file_path, media_type),
         profiles (full_name, phone, email)
       )`
    )
    .eq("id", offerId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
