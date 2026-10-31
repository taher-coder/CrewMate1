import { createClient } from "@/lib/supabase/server";

export interface DashboardMetrics {
  newRequests: number;
  activeJobs: number;
  jobsToday: number;
  availableWorkers: number;
  acceptanceRate: number | null; // percent, 0-100
  completionRate: number | null;
  cancellationRate: number | null;
  averageRating: number | null;
}

const ACTIVE_JOB_STATUSES = ["assigned", "on_the_way", "arrived", "in_progress"];

/**
 * Every number here is a real query against the company's own rows — sec
 * 7.2: "all figures must be calculated from actual records." Nothing here
 * is a placeholder; an empty company legitimately shows zeros.
 */
export async function getDashboardMetrics(companyId: string): Promise<DashboardMetrics> {
  const supabase = await createClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    newRequestsRes,
    activeJobsRes,
    jobsTodayRes,
    availableWorkersRes,
    offersForRateRes,
    jobsForRateRes,
    ratingRes,
  ] = await Promise.all([
    supabase
      .from("request_offers")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "pending"),

    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .in("status", ACTIVE_JOB_STATUSES),

    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("created_at", todayStart.toISOString()),

    supabase
      .from("workers")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "active")
      .eq("is_available", true),

    supabase
      .from("request_offers")
      .select("status")
      .eq("company_id", companyId)
      .in("status", ["accepted", "rejected"]),

    supabase.from("jobs").select("status").eq("company_id", companyId),

    supabase.from("reviews").select("rating").eq("company_id", companyId),
  ]);

  const offers = offersForRateRes.data ?? [];
  const acceptanceRate =
    offers.length > 0
      ? Math.round((offers.filter((o) => o.status === "accepted").length / offers.length) * 100)
      : null;

  const jobs = jobsForRateRes.data ?? [];
  const completionRate =
    jobs.length > 0
      ? Math.round((jobs.filter((j) => j.status === "completed").length / jobs.length) * 100)
      : null;
  const cancellationRate =
    jobs.length > 0
      ? Math.round((jobs.filter((j) => j.status === "cancelled").length / jobs.length) * 100)
      : null;

  const ratings = ratingRes.data ?? [];
  const averageRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length) * 10) / 10
      : null;

  return {
    newRequests: newRequestsRes.count ?? 0,
    activeJobs: activeJobsRes.count ?? 0,
    jobsToday: jobsTodayRes.count ?? 0,
    availableWorkers: availableWorkersRes.count ?? 0,
    acceptanceRate,
    completionRate,
    cancellationRate,
    averageRating,
  };
}

export async function getIncomingOffers(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("request_offers")
    .select(
      "id, created_at, expires_at, requests(id, description, time_type, scheduled_at, service_categories(name))"
    )
    .eq("company_id", companyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(10);
  return data ?? [];
}

export async function getActiveJobsSummary(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("jobs")
    .select("id, status, assigned_at, workers(full_name), requests(service_categories(name))")
    .eq("company_id", companyId)
    .in("status", ACTIVE_JOB_STATUSES)
    .order("assigned_at", { ascending: false })
    .limit(10);
  return data ?? [];
}

export async function getWorkerAvailability(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workers")
    .select("id, full_name, status, is_available, rating_avg")
    .eq("company_id", companyId)
    .order("full_name");
  return data ?? [];
}
