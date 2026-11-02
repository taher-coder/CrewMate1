import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { SupportTicketActions } from "@/components/SupportTicketActions";
import { supportStatus } from "@/lib/status";

export default async function AdminSupportPage() {
  const supabase = await createClient();
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select(
      "id, category, description, status, created_at, companies(display_name, legal_name)",
    )
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-charcoal">
        Support cases
      </h1>
      <div className="space-y-3">
        {tickets?.map((t) => {
          const s = supportStatus(t.status);
          const isOpen = !["resolved", "closed"].includes(t.status);
          return (
            <div key={t.id} className="card max-w-xl rounded-2xl bg-warm-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-charcoal">
                  {t.category}
                  {t.companies && (
                    <span className="ml-2 text-xs font-normal text-muted">
                      — {t.companies.display_name ?? t.companies.legal_name}
                    </span>
                  )}
                </span>
                <StatusBadge label={s.label} tone={s.tone} />
              </div>
              <p className="mt-1 text-sm text-muted">{t.description}</p>
              {isOpen && <SupportTicketActions ticketId={t.id} />}
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
