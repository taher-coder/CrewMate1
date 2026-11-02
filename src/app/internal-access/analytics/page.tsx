import { createClient } from "@/lib/supabase/server";

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();

  const { data: requestStatusCounts } = await supabase
    .from("requests")
    .select("status");

  const { data: categoryCounts } = await supabase
    .from("requests")
    .select("service_categories(name)");

  const { count: completedJobs } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed");

  const { count: totalJobs } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true });

  const statusTally = tally(requestStatusCounts?.map((r) => r.status) ?? []);
  const categoryTally = tally(
    (categoryCounts ?? []).map((r) => r.service_categories?.name ?? "Unknown"),
  );

  const totalRequests = totalCount(statusTally);
  const matchRate =
    totalRequests > 0
      ? Math.round(
          ((totalRequests - (statusTally["no_match"] ?? 0)) / totalRequests) * 100,
        )
      : 0;

  const completionRate =
    totalJobs && totalJobs > 0
      ? Math.round(((completedJobs ?? 0) / totalJobs) * 100)
      : 0;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-charcoal">Analytics</h1>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="card rounded-2xl bg-warm-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Match rate
          </p>
          <p className="mt-1 text-3xl font-bold text-charcoal">
            {matchRate}%
          </p>
          <p className="mt-1 text-xs text-muted">
            Requests that found a company, not no_match
          </p>
        </div>
        <div className="card rounded-2xl bg-warm-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Job completion rate
          </p>
          <p className="mt-1 text-3xl font-bold text-charcoal">
            {completionRate}%
          </p>
          <p className="mt-1 text-xs text-muted">
            {completedJobs ?? 0} of {totalJobs ?? 0} jobs completed
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Breakdown title="Requests by status" data={statusTally} />
        <Breakdown title="Requests by category" data={categoryTally} />
      </div>

      <p className="mt-6 text-xs text-muted">
        Deeper funnels (repeat customers, time-to-match, revenue trends)
        need historical data this young marketplace doesn&apos;t have yet
        — these numbers are real, just thin.
      </p>
    </div>
  );
}

function tally(values: string[]) {
  return values.reduce<Record<string, number>>((acc, v) => {
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {});
}

function totalCount(tally: Record<string, number>) {
  return Object.values(tally).reduce((s, n) => s + n, 0);
}

function Breakdown({
  title,
  data,
}: {
  title: string;
  data: Record<string, number>;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, n]) => n), 1);

  return (
    <div className="card rounded-2xl bg-warm-white p-5">
      <p className="mb-3 text-sm font-semibold text-charcoal">{title}</p>
      {entries.length === 0 ? (
        <p className="text-xs text-muted">No data yet.</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([label, count]) => (
            <div key={label}>
              <div className="mb-0.5 flex justify-between text-xs">
                <span className="text-charcoal">{label}</span>
                <span className="text-muted">{count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-black/5">
                <div
                  className="h-1.5 rounded-full bg-emerald"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
