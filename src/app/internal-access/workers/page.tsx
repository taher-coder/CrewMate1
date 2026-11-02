import { createClient } from "@/lib/supabase/server";
import { Star } from "lucide-react";
import { AdminWorkerStatusAction } from "@/components/AdminWorkerStatusAction";

const STATUS_LABEL: Record<string, string> = {
  invited: "Invited",
  active: "Active",
  inactive: "Suspended",
  removed: "Removed",
};

export default async function AdminWorkersPage() {
  const supabase = await createClient();
  const { data: workers } = await supabase
    .from("workers")
    .select(
      "id, full_name, status, is_available, rating_avg, rating_count, companies(display_name, legal_name)",
    )
    .order("invited_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-charcoal">Workers</h1>
      <p className="mb-6 text-sm text-muted">
        Global worker directory across every company.
      </p>
      <div className="space-y-2">
        {workers?.map((w) => (
          <div
            key={w.id}
            className="card flex items-center justify-between rounded-xl bg-warm-white p-4"
          >
            <div>
              <p className="text-sm font-semibold text-charcoal">
                {w.full_name}
              </p>
              <p className="text-xs text-muted">
                {w.companies?.display_name ?? w.companies?.legal_name}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {w.rating_avg && (
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Star size={12} fill="currentColor" className="text-amber" />
                  {w.rating_avg.toFixed(1)} ({w.rating_count})
                </span>
              )}
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  w.status === "active"
                    ? "bg-success-bg text-success"
                    : w.status === "inactive"
                      ? "bg-danger-bg text-danger"
                      : "bg-black/5 text-muted"
                }`}
              >
                {STATUS_LABEL[w.status]}
              </span>
              <AdminWorkerStatusAction workerId={w.id} status={w.status} />
            </div>
          </div>
        ))}
        {!workers?.length && (
          <p className="text-sm text-muted">No workers yet.</p>
        )}
      </div>
    </div>
  );
}
