import { createClient } from "@/lib/supabase/server";
import { WorkerJobCard } from "@/components/WorkerJobCard";
import { AvailabilityToggle } from "@/components/AvailabilityToggle";

export default async function WorkerHomePage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: worker } = await supabase
    .from("workers")
    .select("id, full_name, is_available")
    .eq("profile_id", userData.user!.id)
    .single();

  const { data: jobs } = worker
    ? await supabase
        .from("jobs")
        .select(
          "id, status, requests(description, service_categories(name), service_problems(name), addresses(line1))",
        )
        .eq("worker_id", worker.id)
        .not("status", "in", "(completed,cancelled)")
        .order("assigned_at", { ascending: true })
    : { data: null };

  return (
    <main className="px-5 pb-4 pt-8">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted">Welcome back</p>
          <h1 className="text-lg font-bold text-charcoal">
            {worker?.full_name}
          </h1>
        </div>
        <AvailabilityToggle initial={worker?.is_available ?? false} />
      </div>

      <h2 className="mb-3 text-sm font-semibold text-charcoal">
        Today&apos;s jobs
      </h2>
      {!jobs || jobs.length === 0 ? (
        <p className="text-sm text-muted">
          No active jobs right now. Go available to receive new
          assignments.
        </p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <WorkerJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </main>
  );
}
