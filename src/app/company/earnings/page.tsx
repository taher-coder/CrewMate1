import { createClient } from "@/lib/supabase/server";
import { IndianRupee } from "lucide-react";

export default async function CompanyEarningsPage() {
  const supabase = await createClient();

  // Net payout only — payment amount minus commission, computed
  // server-side. Never returns the commission figures themselves (see the
  // function's own comment for why gross + net are never shown together).
  const { data, error } = await supabase.rpc("my_company_earnings");

  const earnings = data ?? [];
  const total = earnings.reduce((sum, e) => sum + (e.payout_amount ?? 0), 0);

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-charcoal">Earnings</h1>

      {error ? (
        <div className="card rounded-2xl bg-amber-bg p-5 text-sm text-amber">
          Couldn&apos;t load earnings: {error.message}
        </div>
      ) : (
        <>
          <div className="card mb-5 rounded-2xl bg-warm-white p-5">
            <div className="flex items-center gap-2 text-muted">
              <IndianRupee size={14} />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Total earnings
              </span>
            </div>
            <p className="mt-1 text-3xl font-bold text-charcoal">
              ₹{total.toLocaleString("en-IN")}
            </p>
          </div>

          {earnings.length === 0 ? (
            <p className="text-sm text-muted">
              No completed, paid jobs yet — payments aren&apos;t wired up to
              a real gateway, so this stays empty until that&apos;s built.
            </p>
          ) : (
            <div className="space-y-2">
              {earnings.map((e) => (
                <div
                  key={e.job_id}
                  className="card flex items-center justify-between rounded-xl bg-warm-white p-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-charcoal">
                      {e.category_name}
                    </p>
                    <p className="text-xs text-muted">{e.payment_status}</p>
                  </div>
                  <p className="text-sm font-bold text-charcoal">
                    ₹{e.payout_amount?.toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
