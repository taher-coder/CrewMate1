import Link from "next/link";
import { redirect } from "next/navigation";
import { getCompanyContext } from "@/lib/data/company-context";
import { getOffers } from "@/lib/data/requests";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-neutral-100 text-neutral-600",
  expired: "bg-neutral-100 text-neutral-500",
  revoked: "bg-neutral-100 text-neutral-500",
};

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const ctx = await getCompanyContext();
  if (!ctx) redirect("/apply");

  const { status } = await searchParams;
  const offers = await getOffers(
    ctx.company.id,
    status === "accepted" || status === "rejected" || status === "pending" ? status : undefined
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Requests</h1>
        <p className="text-sm text-neutral-500">Customer requests offered to {ctx.company.legal_name}.</p>
      </div>

      <div className="flex gap-2 text-sm">
        <Tab href="/requests" label="All" active={!status} />
        <Tab href="/requests?status=pending" label="Pending" active={status === "pending"} />
        <Tab href="/requests?status=accepted" label="Accepted" active={status === "accepted"} />
        <Tab href="/requests?status=rejected" label="Rejected" active={status === "rejected"} />
      </div>

      <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 bg-white">
        {offers.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-neutral-400">No requests here.</p>
        )}
        {offers.map((o: any) => (
          <Link
            key={o.id}
            href={`/requests/${o.id}`}
            className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50"
          >
            <div>
              <div className="font-medium text-neutral-900">
                {o.requests?.service_categories?.name ?? "Service request"}
                {o.requests?.service_problems?.name ? ` — ${o.requests.service_problems.name}` : ""}
              </div>
              <div className="mt-0.5 text-xs text-neutral-500">
                {o.requests?.addresses?.city ?? "—"} ·{" "}
                {o.requests?.time_type === "asap"
                  ? "ASAP"
                  : o.requests?.scheduled_at
                  ? new Date(o.requests.scheduled_at).toLocaleString()
                  : "Scheduled"}{" "}
                · {new Date(o.created_at).toLocaleDateString()}
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[o.status] ?? ""}`}>
              {o.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Tab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 font-medium ${
        active ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
      }`}
    >
      {label}
    </Link>
  );
}
