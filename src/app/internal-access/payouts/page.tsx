import { createClient } from "@/lib/supabase/server";
import { TONE_CLASSES, type StatusTone } from "@/lib/status";

const PAYOUT_TONE: Record<string, StatusTone> = {
  pending: "amber",
  processing: "info",
  paid: "success",
  failed: "danger",
};

export default async function AdminPayoutsPage() {
  const supabase = await createClient();
  const { data: payouts } = await supabase
    .from("payouts")
    .select(
      "id, amount, status, period_start, period_end, created_at, companies(display_name, legal_name)",
    )
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-charcoal">
        Company payouts
      </h1>
      <p className="mb-6 text-sm text-muted">
        Settlement batches to companies.
      </p>
      {!payouts?.length ? (
        <p className="text-sm text-muted">
          No payout batches yet — nothing to settle until real payments
          exist.
        </p>
      ) : (
        <div className="space-y-2">
          {payouts.map((p) => (
            <div
              key={p.id}
              className="card flex items-center justify-between rounded-xl bg-warm-white p-4"
            >
              <div>
                <p className="text-sm font-semibold text-charcoal">
                  {p.companies?.display_name ?? p.companies?.legal_name}
                </p>
                <p className="text-xs text-muted">
                  {p.period_start} → {p.period_end}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-charcoal">
                  ₹{p.amount.toLocaleString("en-IN")}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[PAYOUT_TONE[p.status] ?? "neutral"]}`}
                >
                  {p.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
