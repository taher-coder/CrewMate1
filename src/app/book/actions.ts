"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { geocodeAddress, toPointLiteral } from "@/lib/geocoding";

export async function createRequest(input: {
  categoryId: string;
  problemId: string | null;
  description: string;
  addressLine1: string;
  addressLabel: string;
  timeType: "asap" | "scheduled";
  scheduledAt: string | null;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const geo = await geocodeAddress(input.addressLine1, "Ahmedabad");
  const point = toPointLiteral(geo.lat, geo.lng);

  const { data: address, error: addressError } = await supabase
    .from("addresses")
    .insert({
      profile_id: userData.user.id,
      line1: input.addressLine1,
      label: input.addressLabel || null,
      city: "Ahmedabad",
      location: point,
    })
    .select("id")
    .single();

  if (addressError || !address) {
    return { error: addressError?.message ?? "Could not save address" };
  }

  const { data: request, error: requestError } = await supabase
    .from("requests")
    .insert({
      customer_id: userData.user.id,
      category_id: input.categoryId,
      problem_id: input.problemId,
      description: input.description || null,
      address_id: address.id,
      location: point,
      time_type: input.timeType,
      scheduled_at: input.scheduledAt,
      status: "submitted",
    })
    .select("id")
    .single();

  if (requestError || !request) {
    return { error: requestError?.message ?? "Could not submit request" };
  }

  redirect(`/bookings/${request.id}`);
}
