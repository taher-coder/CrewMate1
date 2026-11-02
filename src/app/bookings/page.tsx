import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CustomerNav } from "@/components/CustomerNav";
import { StatusBadge } from "@/components/StatusBadge";
import { requestStatus } from "@/lib/status";
import { ChevronRight, ClipboardList } from "lucide-react";

export default async function BookingsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: requests } = await supabase
    .from("requests")
    .select("id, status, created_at, service_categories(name)")
    .eq("customer_id", userData.user!.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-sage pb-24">
      <header className="px-5 pb-4 pt-8">
        <h1 className="text-xl font-bold text-charcoal">My bookings</h1>
      </header>

      <section className="px-5">
        {!requests || requests.length === 0 ? (
          <div className="card rounded-2xl bg-warm-white p-8 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-sage text-forest">
              <ClipboardList size={20} />
            </div>
            <p className="text-sm text-muted">
              No bookings yet. Head to Home to request a service.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-xl bg-forest px-5 py-2.5 text-sm font-semibold text-white"
            >
              Book a service
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const s = requestStatus(r.status);
              return (
                <Link
                  key={r.id}
                  href={`/bookings/${r.id}`}
                  className="card card-hover flex items-center justify-between rounded-2xl bg-warm-white p-4"
                >
                  <div>
                    <span className="font-semibold text-charcoal">
                      {r.service_categories?.name ?? "Service request"}
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge label={s.label} tone={s.tone} />
                      <span className="text-xs text-muted">
                        {new Date(r.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-muted" />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <CustomerNav />
    </main>
  );
}
