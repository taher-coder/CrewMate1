import { createClient } from "@/lib/supabase/server";
import { WorkerJobCard } from "@/components/WorkerJobCard";

export default async function WorkerAllJobsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: worker } = await supabase
    .from("workers")
    .select("id")
    .eq("profile_id", userData.user!.id)
    .single();

  const { data: jobs } = worker
    ? await supabase
        .from("jobs")
        .select(
          "id, status, requests(description, service_categories(name), service_problems(name), addresses(line1))",
        )
        .eq("worker_id", worker.id)
        .order("assigned_at", { ascending: false })
    : { data: null };

  return (
    <main className="px-5 pb-4 pt-8">
      <h1 className="mb-5 text-lg font-bold text-charcoal">All jobs</h1>
      <div className="space-y-3">
        {jobs?.map((job) => (
          <WorkerJobCard key={job.id} job={job} />
        ))}
        {!jobs?.length && (
          <p className="text-sm text-muted">No jobs assigned yet.</p>
        )}
      </div>
    </main>
  );
}
