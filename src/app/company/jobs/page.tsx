import { createClient } from "@/lib/supabase/server";
import { getMyCompany } from "@/lib/company";
import { JobCard } from "@/components/JobCard";

export default async function CompanyJobsPage() {
  const supabase = await createClient();
  const membership = await getMyCompany(supabase);
  if (!membership?.companies) return null;

  const { data: jobs } = await supabase
    .from("jobs")
    .select(
      "id, status, worker_id, requests(category_id, service_categories(name)), workers(full_name)",
    )
    .eq("company_id", membership.companies.id)
    .order("assigned_at", { ascending: false });

  const { data: workers } = await supabase
    .from("workers")
    .select("id, full_name")
    .eq("company_id", membership.companies.id)
    .eq("status", "active");

  const { data: skills } = workers?.length
    ? await supabase
        .from("worker_services")
        .select("worker_id, category_id")
        .in("worker_id", workers.map((w) => w.id))
    : { data: [] };

  // Only offer workers who are actually eligible for a job's category —
  // the database enforces this anyway (fn_validate_worker_assignment
  // raises "not eligible for service category" otherwise), but surfacing
  // only valid choices here means the company never hits that error in
  // the first place, and never sees a worker in the dropdown who can't
  // actually be assigned.
  const workersByCategory = new Map<string, { id: string; full_name: string }[]>();
  for (const s of skills ?? []) {
    const worker = workers?.find((w) => w.id === s.worker_id);
    if (!worker) continue;
    const list = workersByCategory.get(s.category_id) ?? [];
    list.push(worker);
    workersByCategory.set(s.category_id, list);
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-charcoal">Jobs</h1>
      {!jobs || jobs.length === 0 ? (
        <p className="text-sm text-muted">
          No jobs yet — accept a request from the inbox to create one.
        </p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const categoryId = job.requests?.category_id;
            const eligibleWorkers = categoryId
              ? (workersByCategory.get(categoryId) ?? [])
              : [];
            return (
              <JobCard key={job.id} job={job} availableWorkers={eligibleWorkers} />
            );
          })}
        </div>
      )}
    </div>
  );
}
