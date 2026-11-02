"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { geocodeAddress, toPointLiteral } from "@/lib/geocoding";

export async function updateProfile(input: { fullName: string; phone: string }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: input.fullName || null, phone: input.phone || null })
    .eq("id", userData.user.id);

  if (error) return { error: error.message };
  revalidatePath("/profile");
  return { error: null };
}

export async function addAddress(input: {
  label: string;
  line1: string;
  city: string;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not signed in" };

  const city = input.city || "Ahmedabad";
  const geo = await geocodeAddress(input.line1, city);

  const { error } = await supabase.from("addresses").insert({
    profile_id: userData.user.id,
    label: input.label || null,
    line1: input.line1,
    city,
    location: toPointLiteral(geo.lat, geo.lng),
  });

  if (error) return { error: error.message };
  revalidatePath("/addresses");
  return { error: null };
}

export async function deleteAddress(addressId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("addresses").delete().eq("id", addressId);
  if (error) return { error: error.message };
  revalidatePath("/addresses");
  return { error: null };
}

export async function setDefaultAddress(addressId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Not signed in" };

  // Two writes, not a transaction — Supabase's JS client has no
  // multi-statement transaction primitive, and this isn't worth a
  // dedicated RPC for a two-row toggle. Worst case on a mid-request
  // failure: two addresses briefly show as default, which self-corrects
  // on the next successful call. Never two addresses permanently stuck
  // as default with no way to fix it, which is the failure mode that
  // would actually matter.
  await supabase
    .from("addresses")
    .update({ is_default: false })
    .eq("profile_id", userData.user.id);

  const { error } = await supabase
    .from("addresses")
    .update({ is_default: true })
    .eq("id", addressId);

  if (error) return { error: error.message };
  revalidatePath("/addresses");
  return { error: null };
}
