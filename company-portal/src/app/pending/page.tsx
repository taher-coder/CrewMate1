import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCompanyContext } from "@/lib/data/company-context";

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  applied: {
    title: "Application received",
    body: "We've got your application. An admin will review it shortly.",
  },
  under_review: {
    title: "Under review",
    body: "An admin is reviewing your application and documents now.",
  },
  info_requested: {
    title: "We need a bit more information",
    body: "An admin asked for additional details before approving your application.",
  },
  rejected: {
    title: "Application not approved",
    body: "Your application wasn't approved this time. Contact support for details.",
  },
  suspended: {
    title: "Account suspended",
    body: "Your company's access has been suspended. Contact support for details.",
  },
};

export default async function PendingPage() {
  const ctx = await getCompanyContext();
  if (!ctx) redirect("/apply");
  if (ctx.company.status === "verified") redirect("/dashboard");

  const supabase = await createClient();
  const { data: application } = await supabase
    .from("company_applications")
    .select("status, info_requested_notes, created_at")
    .eq("company_id", ctx.company.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const copy = STATUS_COPY[ctx.company.status] ?? STATUS_COPY.applied;

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold">{copy.title}</h1>
        <p className="mt-2 text-sm text-neutral-500">{copy.body}</p>

        {application?.info_requested_notes && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-800">
            <span className="font-medium">Admin note:</span> {application.info_requested_notes}
          </div>
        )}

        <p className="mt-6 text-xs text-neutral-400">
          Company: {ctx.company.legal_name} · Status: {ctx.company.status.replace("_", " ")}
        </p>
      </div>
    </main>
  );
}
