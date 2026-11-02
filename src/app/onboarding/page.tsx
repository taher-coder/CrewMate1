import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InviteAcceptCard } from "@/components/InviteAcceptCard";

const ROLE_HOME: Record<string, string> = {
  customer: "/",
  company_owner: "/company",
  company_staff: "/company",
  worker: "/worker",
  admin: "/internal-access",
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  // A `profiles` row is created automatically by the `on_auth_user_created`
  // trigger the moment the auth.users row exists (role defaults to
  // 'customer' there). We only read it and route accordingly, never
  // insert it ourselves — that would collide with the trigger.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (!profile) {
    // Trigger hasn't landed yet (rare race right after verifying the OTP
    // link) — bounce back here once rather than guessing.
    return (
      <main className="flex min-h-screen items-center justify-center bg-sage px-4">
        <p className="text-sm text-muted">
          Setting up your account…{" "}
          <a href="/onboarding" className="font-semibold text-forest">
            refresh
          </a>
        </p>
      </main>
    );
  }

  if (profile.role !== "customer") {
    redirect(ROLE_HOME[profile.role] ?? "/");
  }

  // Still a plain customer — check for a pending worker invite matching
  // this account's own verified email. This calls the same lookup
  // accept_worker_invite() itself uses internally, so the two can never
  // disagree about whether an invite exists.
  const { data: invite } = await supabase
    .rpc("my_pending_worker_invite")
    .maybeSingle();

  if (invite?.company_name) {
    return <InviteAcceptCard companyName={invite.company_name} />;
  }

  redirect("/");
}
