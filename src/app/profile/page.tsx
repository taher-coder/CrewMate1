import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CustomerNav } from "@/components/CustomerNav";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { signOut } from "@/app/actions";
import { MapPin, ChevronRight, LogOut, Briefcase } from "lucide-react";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", userData.user!.id)
    .single();

  return (
    <main className="min-h-screen bg-sage pb-24">
      <header className="px-5 pb-4 pt-8">
        <h1 className="text-xl font-bold text-charcoal">My profile</h1>
        <p className="text-sm text-muted">{profile?.email}</p>
      </header>

      <section className="space-y-3 px-5">
        <ProfileEditForm
          initialName={profile?.full_name ?? ""}
          initialPhone={profile?.phone ?? ""}
        />

        <Link
          href="/addresses"
          className="card card-hover flex items-center justify-between rounded-2xl bg-warm-white p-4"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-charcoal">
            <MapPin size={16} className="text-muted" />
            Saved addresses
          </span>
          <ChevronRight size={16} className="text-muted" />
        </Link>

        <Link
          href="/become-a-partner"
          className="card card-hover flex items-center justify-between rounded-2xl bg-warm-white p-4"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-charcoal">
            <Briefcase size={16} className="text-muted" />
            Become a CrewMate partner
          </span>
          <ChevronRight size={16} className="text-muted" />
        </Link>

        <form action={signOut}>
          <button className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-warm-white py-3 text-sm font-semibold text-danger">
            <LogOut size={15} />
            Sign out
          </button>
        </form>
      </section>

      <CustomerNav />
    </main>
  );
}
