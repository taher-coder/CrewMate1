import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ApplyAsCompanyForm } from "@/components/ApplyAsCompanyForm";
import { ArrowLeft } from "lucide-react";

export default async function BecomeAPartnerPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  // Already applied (or already a member some other way) — show status
  // instead of letting them file a second application. apply_as_company()
  // itself also blocks a duplicate, but the DB error is not a great first
  // thing for a returning applicant to see.
  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id, companies(display_name, status)")
    .eq("profile_id", userData.user!.id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-sage pb-10">
      <header className="flex items-center gap-3 bg-gradient-to-br from-forest to-forest-dark px-5 py-5 text-white">
        <Link href="/profile" className="grid h-8 w-8 place-items-center rounded-full bg-white/10">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-sm font-semibold">Become a CrewMate partner</h1>
          <p className="text-xs text-white/70">Register your business to receive service requests</p>
        </div>
      </header>

      <section className="space-y-3 px-5 pt-5">
        {membership ? (
          <StatusCard
            name={(membership as unknown as { companies: { display_name: string | null } }).companies?.display_name ?? "Your company"}
            status={(membership as unknown as { companies: { status: string } }).companies?.status}
          />
        ) : (
          <ApplyAsCompanyForm />
        )}
      </section>
    </main>
  );
}

function StatusCard({ name, status }: { name: string; status?: string }) {
  const copy: Record<string, string> = {
    applied: "Your application has been received and is queued for review.",
    under_review: "Our team is reviewing your application.",
    info_requested: "We need a bit more information from you — our team will reach out.",
    verified: "You're verified! Head to your company dashboard.",
    rejected: "Your application wasn't approved this time.",
    suspended: "Your company account is currently suspended.",
  };

  return (
    <div className="card rounded-2xl bg-warm-white p-5">
      <p className="text-sm font-semibold text-charcoal">{name}</p>
      <p className="mt-1 text-sm text-muted">{copy[status ?? ""] ?? "Application submitted."}</p>
      {status === "verified" && (
        <Link
          href="/company"
          className="mt-3 inline-block rounded-xl bg-forest px-4 py-2 text-xs font-semibold text-white"
        >
          Go to company dashboard
        </Link>
      )}
    </div>
  );
}
