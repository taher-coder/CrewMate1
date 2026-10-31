import { getCompanyContext } from "@/lib/data/company-context";
import {
  getDashboardMetrics,
  getIncomingOffers,
  getActiveJobsSummary,
  getWorkerAvailability,
} from "@/lib/data/dashboard";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const ctx = await getCompanyContext();
  if (!ctx) redirect("/apply");

  const [metrics, offers, activeJobs, workers] = await Promise.all([
    getDashboardMetrics(ctx.company.id),
    getIncomingOffers(ctx.company.id),
    getActiveJobsSummary(ctx.company.id),
    getWorkerAvailability(ctx.company.id),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-neutral-500">{ctx.company.legal_name}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="New Requests" value={metrics.newRequests} />
        <MetricCard label="Active Jobs" value={metrics.activeJobs} />
        <MetricCard label="Jobs Today" value={metrics.jobsToday} />
        <MetricCard label="Available Workers" value={metrics.availableWorkers} />
        <MetricCard label="Acceptance Rate" value={formatPct(metrics.acceptanceRate)} />
        <MetricCard label="Completion Rate" value={formatPct(metrics.completionRate)} />
        <MetricCard label="Cancellation Rate" value={formatPct(metrics.cancellationRate)} />
        <MetricCard label="Average Rating" value={metrics.averageRating ? `${metrics.averageRating} / 5` : "—"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Incoming Requests" emptyLabel="No pending requests right now.">
          {offers.map((o: any) => (
            <div key={o.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <div className="font-medium text-neutral-900">
                  {o.requests?.service_categories?.name ?? "Service request"}
                </div>
                <div className="text-xs text-neutral-500">
                  {o.requests?.time_type === "asap" ? "ASAP" : "Scheduled"} ·{" "}
                  {new Date(o.created_at).toLocaleString()}
                </div>
              </div>
              <a href={`/requests/${o.id}`} className="text-xs font-medium text-neutral-900 underline">
                Review
              </a>
            </div>
          ))}
        </Panel>

        <Panel title="Active Jobs" emptyLabel="No active jobs right now.">
          {activeJobs.map((j: any) => (
            <div key={j.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <div className="font-medium text-neutral-900">
                  {j.requests?.service_categories?.name ?? "Job"}
                </div>
                <div className="text-xs text-neutral-500">
                  {j.workers?.full_name ?? "Unassigned"} · {j.status.replace("_", " ")}
                </div>
              </div>
              <a href={`/jobs/${j.id}`} className="text-xs font-medium text-neutral-900 underline">
                View
              </a>
            </div>
          ))}
        </Panel>

        <Panel title="Worker Availability" emptyLabel="No workers added yet.">
          {workers.map((w) => (
            <div key={w.id} className="flex items-center justify-between py-2 text-sm">
              <div className="font-medium text-neutral-900">{w.full_name}</div>
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`h-2 w-2 rounded-full ${
                    w.status === "active" && w.is_available ? "bg-green-500" : "bg-neutral-300"
                  }`}
                />
                <span className="text-neutral-500">
                  {w.status !== "active" ? w.status : w.is_available ? "Available" : "Offline"}
                </span>
              </div>
            </div>
          ))}
        </Panel>

        <Panel title="Attention Required" emptyLabel="Nothing needs your attention.">
          {metrics.newRequests > 0 && (
            <AttentionRow text={`${metrics.newRequests} request(s) awaiting your decision`} href="/requests" />
          )}
          {activeJobs.some((j: any) => j.status === "assigned" && !j.workers) && (
            <AttentionRow text="Some assigned jobs still have no worker" href="/dispatch" />
          )}
        </Panel>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="text-xs font-medium text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-neutral-900">{value}</div>
    </div>
  );
}

function Panel({
  title,
  emptyLabel,
  children,
}: {
  title: string;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  const hasContent = Array.isArray(children) ? children.some(Boolean) : Boolean(children);
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
      <div className="mt-2 divide-y divide-neutral-100">
        {hasContent ? children : <p className="py-4 text-sm text-neutral-400">{emptyLabel}</p>}
      </div>
    </div>
  );
}

function AttentionRow({ text, href }: { text: string; href: string }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-neutral-700">{text}</span>
      <a href={href} className="text-xs font-medium text-neutral-900 underline">
        Resolve
      </a>
    </div>
  );
}

function formatPct(v: number | null) {
  return v === null ? "—" : `${v}%`;
}
