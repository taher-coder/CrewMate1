import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AddressCard } from "@/components/AddressCard";
import { AddAddressForm } from "@/components/AddAddressForm";
import { ArrowLeft } from "lucide-react";

export default async function AddressesPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: addresses } = await supabase
    .from("addresses")
    .select("id, label, line1, city, is_default")
    .eq("profile_id", userData.user!.id)
    .order("is_default", { ascending: false });

  return (
    <main className="min-h-screen bg-sage pb-10">
      <header className="flex items-center gap-3 bg-gradient-to-br from-forest to-forest-dark px-5 py-5 text-white">
        <Link href="/profile" className="grid h-8 w-8 place-items-center rounded-full bg-white/10">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-sm font-semibold">Saved addresses</h1>
      </header>

      <section className="space-y-3 px-5 pt-5">
        {addresses?.map((a) => (
          <AddressCard key={a.id} address={a} />
        ))}
        <AddAddressForm />
      </section>
    </main>
  );
}
