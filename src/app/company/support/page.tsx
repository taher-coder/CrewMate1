import { createClient } from "@/lib/supabase/server";
import { getMyCompany } from "@/lib/company";
import { NewSupportTicketForm } from "@/components/NewSupportTicketForm";
import { StatusBadge } from "@/components/StatusBadge";
import { supportStatus } from "@/lib/status";

export default async function CompanySupportPage() {
  const supabase = await createClient();
  const membership = await getMyCompany(supabase);
  if (!membership?.companies) return null;

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, category, description, status, created_at")
    .eq("company_id", membership.companies.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-charcoal">Support cases</h1>
      <NewSupportTicketForm companyId={membership.companies.id} />
      <div className="space-y-2">
        {tickets?.map((t) => {
          const s = supportStatus(t.status);
          return (
            <div key={t.id} className="card rounded-xl bg-warm-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-charcoal">
                  {t.category}
                </span>
                <StatusBadge label={s.label} tone={s.tone} />
              </div>
              <p className="mt-1 text-sm text-muted">{t.description}</p>
              <p className="mt-1 text-xs text-muted">
                {new Date(t.created_at).toLocaleDateString("en-IN", {
                  dateStyle: "medium",
                })}
              </p>
            </div>
          );
        })}
        {!tickets?.length && (
          <p className="text-sm text-muted">No support cases yet.</p>
        )}
      </div>
    </div>
  );
}
