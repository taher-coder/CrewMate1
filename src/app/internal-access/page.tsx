import { createClient } from "@/lib/supabase/server";
import { ClipboardCheck, BadgeCheck, FileSearch, Briefcase } from "lucide-react";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const { count: pendingApplications } = await supabase
    .from("company_applications")
    .select("id", { count: "exact", head: true })
    .in("status", ["applied", "under_review", "info_requested"]);

  const { count: verifiedCompanies } = await supabase
    .from("companies")
    .select("id", { count: "exact", head: true })
    .eq("status", "verified");

  const { count: totalRequests } = await supabase
    .from("requests")
    .select("id", { count: "exact", head: true });

  const { count: activeJobs } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .not("status", "in", "(completed,cancelled)");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-charcoal">
        Marketplace overview
      </h1>
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={FileSearch}
          label="Applications to review"
          value={pendingApplications ?? 0}
          accent="amber"
        />
        <StatCard
          icon={BadgeCheck}
          label="Verified companies"
          value={verifiedCompanies ?? 0}
          accent="success"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Total requests"
          value={totalRequests ?? 0}
          accent="info"
        />
        <StatCard
          icon={Briefcase}
          label="Active jobs"
          value={activeJobs ?? 0}
          accent="info"
        />
      </div>
    </div>
  );
}

const ACCENT: Record<string, string> = {
  amber: "bg-amber-bg text-amber",
  info: "bg-info-bg text-info",
  success: "bg-success-bg text-success",
};

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="card card-hover rounded-2xl bg-warm-white p-5">
      <div className={`mb-3 grid h-9 w-9 place-items-center rounded-lg ${ACCENT[accent]}`}>
        <Icon size={17} />
      </div>
      <p className="text-2xl font-bold text-charcoal">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}
