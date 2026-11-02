import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CustomerNav } from "@/components/CustomerNav";
import { StatusBadge } from "@/components/StatusBadge";
import { requestStatus } from "@/lib/status";
import { Wrench, Zap, Snowflake, ChevronRight, MapPin } from "lucide-react";

const ACTIVE_STATUSES = [
  "submitted",
  "finding_companies",
  "companies_notified",
  "company_accepted",
  "worker_assignment_pending",
  "professional_assigned",
] as const;

const CATEGORY_ICON: Record<string, React.ElementType> = {
  plumbing: Wrench,
  electrical: Zap,
  "ac-repair": Snowflake,
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: categories } = await supabase
    .from("service_categories")
    .select("id, name, slug, description")
    .eq("is_active", true)
    .order("sort_order");

  const { data: activeRequests } = await supabase
    .from("requests")
    .select("id, status, created_at, service_categories(name)")
    .eq("customer_id", userData.user!.id)
    .in("status", ACTIVE_STATUSES)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-sage pb-24">
      <header className="relative overflow-hidden bg-gradient-to-br from-forest to-forest-dark px-5 pb-8 pt-9 text-white">
        <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-emerald/20 blur-2xl" />
        <div className="relative flex items-center gap-1.5 text-xs font-medium text-white/70">
          <MapPin size={13} />
          Ahmedabad, Gujarat
        </div>
        <h1 className="relative mt-3 text-2xl font-bold leading-tight">
          What do you need
          <br />
          fixed today?
        </h1>
      </header>

      <section className="relative -mt-4 px-5">
        {activeRequests && activeRequests.length > 0 && (
          <div className="mb-4 space-y-3">
            {activeRequests.map((r) => {
              const s = requestStatus(r.status);
              return (
                <Link
                  key={r.id}
                  href={`/bookings/${r.id}`}
                  className="card card-hover flex items-center justify-between rounded-2xl bg-warm-white p-4"
                >
                  <div>
                    <span className="block text-sm font-semibold text-charcoal">
                      {r.service_categories?.name ?? "Service request"}
                    </span>
                    <span className="mt-1 inline-block">
                      <StatusBadge label={s.label} tone={s.tone} />
                    </span>
                  </div>
                  <ChevronRight size={18} className="text-muted" />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="px-5 pt-3">
        <h2 className="mb-3 text-sm font-semibold text-charcoal">
          Our services
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {categories?.map((c) => {
            const Icon = CATEGORY_ICON[c.slug] ?? Wrench;
            return (
              <Link
                key={c.id}
                href={`/book/${c.slug}`}
                className="card card-hover group rounded-2xl bg-warm-white p-4"
              >
                <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-sage text-forest transition-colors group-hover:bg-emerald group-hover:text-white">
                  <Icon size={20} strokeWidth={2} />
                </div>
                <p className="text-sm font-semibold text-charcoal">
                  {c.name}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-emerald">
                  Book now
                  <ChevronRight size={13} />
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="px-5 pt-6">
        <div className="card rounded-2xl bg-warm-white p-4">
          <p className="text-xs font-semibold text-charcoal">
            Why CrewMate
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Perk label="Verified companies" />
            <Perk label="Transparent pricing" />
            <Perk label="No silent cancels" />
          </div>
        </div>
      </section>

      <CustomerNav />
    </main>
  );
}

function Perk({ label }: { label: string }) {
  return (
    <div className="rounded-xl bg-sage px-2 py-3">
      <p className="text-[11px] font-medium leading-tight text-forest">
        {label}
      </p>
    </div>
  );
}
