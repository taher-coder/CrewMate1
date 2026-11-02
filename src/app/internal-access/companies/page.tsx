import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { companyAppStatus } from "@/lib/status";
import { StatusBadge } from "@/components/StatusBadge";
import { ChevronRight } from "lucide-react";

export default async function AdminCompaniesPage() {
  const supabase = await createClient();
  const { data: companies } = await supabase
    .from("companies")
    .select("id, legal_name, display_name, status, city, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-charcoal">Companies</h1>
      <div className="space-y-2">
        {companies?.map((c) => {
          const s = companyAppStatus(c.status);
          return (
            <Link
              key={c.id}
              href={`/internal-access/companies/${c.id}`}
              className="card card-hover flex items-center justify-between rounded-xl bg-warm-white p-4"
            >
              <div>
                <p className="text-sm font-semibold text-charcoal">
                  {c.display_name ?? c.legal_name}
                </p>
                <p className="text-xs text-muted">{c.city}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge label={s.label} tone={s.tone} />
                <ChevronRight size={16} className="text-muted" />
              </div>
            </Link>
          );
        })}
        {!companies?.length && (
          <p className="text-sm text-muted">No companies yet.</p>
        )}
      </div>
    </div>
  );
}
