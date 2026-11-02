import { createClient } from "@/lib/supabase/server";

export default async function AdminCommissionsPage() {
  const supabase = await createClient();
  const { data: commissions } = await supabase
    .from("commissions")
    .select("id, rate, amount, created_at, companies(display_name, legal_name)")
    .order("created_at", { ascending: false });

  const totalCommission = (commissions ?? []).reduce((s, c) => s + c.amount, 0);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-charcoal">Commissions</h1>
      <p className="mb-6 text-sm text-muted">
        Platform commission ledger — visible only to admin/finance, by
        design (see the privacy fix applied to this table).
      </p>

      <div className="card mb-5 max-w-xs rounded-2xl bg-warm-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Total commission earned
        </p>
        <p className="mt-1 text-3xl font-bold text-charcoal">
          ₹{totalCommission.toLocaleString("en-IN")}
        </p>
      </div>

      {!commissions?.length ? (
        <p className="text-sm text-muted">
          No commission records yet — tied to real payments, which aren&apos;t
          flowing yet.
        </p>
      ) : (
        <div className="space-y-2">
          {commissions.map((c) => (
            <div
              key={c.id}
              className="card flex items-center justify-between rounded-xl bg-warm-white p-4"
            >
              <div>
                <p className="text-sm font-semibold text-charcoal">
                  {c.companies?.display_name ?? c.companies?.legal_name}
                </p>
                <p className="text-xs text-muted">{c.rate}% rate</p>
              </div>
              <span className="text-sm font-bold text-charcoal">
                ₹{c.amount.toLocaleString("en-IN")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
