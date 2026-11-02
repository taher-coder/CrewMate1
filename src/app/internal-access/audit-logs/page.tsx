import { createClient } from "@/lib/supabase/server";
import { FileClock } from "lucide-react";

export default async function AdminAuditLogsPage() {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-charcoal">Audit logs</h1>
      <p className="mb-6 text-sm text-muted">
        Append-only record of sensitive actions. Most recent 200.
      </p>
      {!logs?.length ? (
        <p className="text-sm text-muted">No audit events yet.</p>
      ) : (
        <div className="space-y-1.5">
          {logs.map((l) => (
            <div
              key={l.id}
              className="card flex items-center gap-3 rounded-lg bg-warm-white px-4 py-2.5"
            >
              <FileClock size={14} className="shrink-0 text-muted" />
              <span className="text-xs font-mono text-charcoal">
                {l.action}
              </span>
              <span className="text-xs text-muted">
                {l.entity_type} · {l.entity_id?.slice(0, 8)}
              </span>
              <span className="ml-auto whitespace-nowrap text-xs text-muted">
                {new Date(l.created_at).toLocaleString("en-IN", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
