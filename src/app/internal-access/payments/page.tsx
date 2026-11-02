import { createClient } from "@/lib/supabase/server";
import { TONE_CLASSES, type StatusTone } from "@/lib/status";

const PAYMENT_TONE: Record<string, StatusTone> = {
  pending: "amber",
  authorized: "info",
  captured: "success",
  failed: "danger",
  refunded: "neutral",
};

export default async function AdminPaymentsPage() {
  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select(
      "id, amount, status, provider, provider_ref, created_at, jobs(companies(display_name, legal_name))",
    )
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-charcoal">Payments</h1>
      <p className="mb-6 text-sm text-muted">
        Transaction ledger across the whole marketplace.
      </p>
      {!payments?.length ? (
        <div className="card rounded-2xl bg-warm-white p-6 text-sm text-muted">
          No payments recorded yet — this is honest emptiness, not a
          loading bug: there&apos;s no real payment gateway wired up, so
          nothing writes to this table yet.
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <div
              key={p.id}
              className="card flex items-center justify-between rounded-xl bg-warm-white p-4"
            >
              <div>
                <p className="text-sm font-semibold text-charcoal">
                  {p.jobs?.companies?.display_name ?? p.jobs?.companies?.legal_name ?? "—"}
                </p>
                <p className="text-xs text-muted">
                  {p.provider}
                  {p.provider_ref ? ` · ${p.provider_ref}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-charcoal">
                  ₹{p.amount.toLocaleString("en-IN")}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[PAYMENT_TONE[p.status] ?? "neutral"]}`}
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
