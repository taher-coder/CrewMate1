import { createClient } from "@/lib/supabase/server";
import { getMyCompany } from "@/lib/company";
import { offerStatus } from "@/lib/status";
import { StatusBadge } from "@/components/StatusBadge";
import { OfferActions } from "@/components/OfferActions";

export default async function CompanyRequestsPage() {
  const supabase = await createClient();
  const membership = await getMyCompany(supabase);
  if (!membership?.companies) return null;

  const { data: offers } = await supabase
    .from("request_offers")
    .select(
      "id, status, created_at, expires_at, requests(id, description, time_type, service_categories(name), service_problems(name))",
    )
    .eq("company_id", membership.companies.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-charcoal">Request inbox</h1>

      {!offers || offers.length === 0 ? (
        <p className="text-sm text-muted">
          No requests yet. New customer requests routed to your company will
          appear here.
        </p>
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => {
            const s = offerStatus(offer.status);
            const r = offer.requests;
            return (
              <div
                key={offer.id}
                className="rounded-2xl bg-warm-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-charcoal">
                    {r?.service_categories?.name} —{" "}
                    {r?.service_problems?.name ?? "General issue"}
                  </span>
                  <StatusBadge label={s.label} tone={s.tone} />
                </div>
                {r?.description && (
                  <p className="mt-1 text-sm text-muted">{r.description}</p>
                )}
                <p className="mt-1 text-xs text-muted">
                  {r?.time_type === "asap" ? "ASAP" : "Scheduled"} ·{" "}
                  {new Date(offer.created_at).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                {offer.status === "pending" && (
                  <OfferActions offerId={offer.id} />
                )}
                {offer.status === "accepted" && (
                  <p className="mt-2 text-xs font-medium text-success">
                    Accepted — assign a worker from Jobs.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
