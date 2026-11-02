import { createClient } from "@/lib/supabase/server";
import { getMyCompany } from "@/lib/company";
import { InviteWorkerForm } from "@/components/InviteWorkerForm";
import { WorkerSkillChips } from "@/components/WorkerSkillChips";

const WORKER_STATUS_LABEL: Record<string, string> = {
  invited: "Invited — pending",
  active: "Active",
  inactive: "Inactive",
  removed: "Removed",
};

export default async function CompanyWorkersPage() {
  const supabase = await createClient();
  const membership = await getMyCompany(supabase);
  if (!membership?.companies) return null;

  const { data: workers } = await supabase
    .from("workers")
    .select("id, full_name, status, invite_phone, invite_email, rating_avg, is_available")
    .eq("company_id", membership.companies.id)
    .order("invited_at", { ascending: false });

  const { data: categories } = await supabase
    .from("service_categories")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order");

  const { data: skills } = workers?.length
    ? await supabase
        .from("worker_services")
        .select("worker_id, category_id")
        .in("worker_id", workers.map((w) => w.id))
    : { data: [] };

  const skillsByWorker = new Map<string, string[]>();
  for (const s of skills ?? []) {
    const list = skillsByWorker.get(s.worker_id) ?? [];
    list.push(s.category_id);
    skillsByWorker.set(s.worker_id, list);
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-charcoal">Workers</h1>

      <InviteWorkerForm companyId={membership.companies.id} />

      <div className="space-y-2">
        {workers?.map((w) => (
          <div key={w.id} className="card rounded-xl bg-warm-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-charcoal">
                  {w.full_name}
                </p>
                <p className="text-xs text-muted">
                  {w.invite_phone ?? w.invite_email ?? "No contact on file"}
                </p>
              </div>
              <div className="text-right text-xs">
                <p className="font-medium text-charcoal">
                  {WORKER_STATUS_LABEL[w.status]}
                </p>
                {w.rating_avg && (
                  <p className="text-muted">★ {w.rating_avg.toFixed(1)}</p>
                )}
              </div>
            </div>
            {w.status !== "removed" && categories && (
              <>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Skills — must be set before this worker can be assigned a job
                </p>
                <WorkerSkillChips
                  workerId={w.id}
                  categories={categories}
                  enabledCategoryIds={skillsByWorker.get(w.id) ?? []}
                />
              </>
            )}
            {w.status === "invited" && (
              <p className="mt-2 text-[11px] text-amber">
                Still invited, not active yet — there&apos;s no real
                invite-acceptance flow wired up, so this worker can be
                assigned a job (if skilled) but won&apos;t actually be able
                to sign in and use the worker app until that&apos;s built.
              </p>
            )}
          </div>
        ))}
        {!workers?.length && (
          <p className="text-sm text-muted">No workers invited yet.</p>
        )}
      </div>
    </div>
  );
}
