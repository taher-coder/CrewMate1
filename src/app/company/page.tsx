import { createClient } from "@/lib/supabase/server";
import { getMyCompany } from "@/lib/company";
import { companyAppStatus } from "@/lib/status";
import { StatusBadge } from "@/components/StatusBadge";
import { Inbox, Briefcase, Users } from "lucide-react";

export default async function CompanyDashboardPage() {
  const supabase = await createClient();
  const membership = await getMyCompany(supabase);

  if (!membership?.companies) {
    return <p className="text-sm text-muted">No company membership found.</p>;
  }

  const company = membership.companies;

  const { count: pendingOffers } = await supabase
    .from("request_offers")
    .select("id", { count: "exact", head: true })
    .eq("company_id", company.id)
    .eq("status", "pending");

  const { count: activeJobs } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("company_id", company.id)
    .not("status", "in", "(completed,cancelled)");

  const { count: workerCount } = await supabase
    .from("workers")
    .select("id", { count: "exact", head: true })
    .eq("company_id", company.id);

  const appStatus = companyAppStatus(company.status);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">
            {company.display_name ?? company.legal_name}
          </h1>
          <p className="text-sm text-muted">Dashboard</p>
        </div>
        <StatusBadge label={appStatus.label} tone={appStatus.tone} />
      </div>

      {company.status !== "verified" && (
        <div className="mb-6 rounded-xl bg-amber-bg px-4 py-3 text-sm text-amber">
          Your company isn&apos;t verified yet. You won&apos;t receive
          customer requests until CrewMate approves your application.
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={Inbox}
          label="Pending requests"
          value={pendingOffers ?? 0}
          accent="amber"
        />
        <StatCard
          icon={Briefcase}
          label="Active jobs"
          value={activeJobs ?? 0}
          accent="info"
        />
        <StatCard
          icon={Users}
          label="Workers"
          value={workerCount ?? 0}
          accent="success"
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
