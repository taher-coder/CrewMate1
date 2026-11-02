import { createClient } from "@/lib/supabase/server";
import { companyAppStatus } from "@/lib/status";
import { StatusBadge } from "@/components/StatusBadge";
import { ApplicationDecision } from "@/components/ApplicationDecision";
import { CompanySuspensionToggle } from "@/components/CompanySuspensionToggle";
import { notFound } from "next/navigation";

export default async function AdminCompanyWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();

  if (!company) notFound();

  const { data: application } = await supabase
    .from("company_applications")
    .select("id, status, info_requested_notes, reviewed_at, created_at")
    .eq("company_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: documents } = await supabase
    .from("company_documents")
    .select("id, document_type, status, file_path")
    .eq("company_id", id);

  const s = companyAppStatus(company.status);
  const canDecide =
    application &&
    ["applied", "under_review", "info_requested"].includes(application.status);

  return (
    <div className="max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-charcoal">
          {company.display_name ?? company.legal_name}
        </h1>
        <StatusBadge label={s.label} tone={s.tone} />
      </div>

      <div className="rounded-2xl bg-warm-white p-5 shadow-sm">
        <Row label="Legal name" value={company.legal_name} />
        <Row label="City" value={company.city} />
        <Row label="Phone" value={company.phone ?? "—"} />
        <Row label="Email" value={company.email ?? "—"} />
        <Row label="Commission rate" value={`${company.commission_rate}%`} />
      </div>

      <div className="mt-4 rounded-2xl bg-warm-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-charcoal">
          Submitted documents
        </h2>
        {!documents?.length ? (
          <p className="text-sm text-muted">No documents uploaded yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {documents.map((d) => (
              <li key={d.id} className="flex justify-between text-sm">
                <span className="text-charcoal">{d.document_type}</span>
                <span className="text-muted">{d.status}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-muted">
          Document storage/signed URLs aren&apos;t wired up yet — this lists
          what&apos;s on record, not a file preview.
        </p>
      </div>

      {canDecide && application && (
        <ApplicationDecision applicationId={application.id} />
      )}

      {company.status === "verified" || company.status === "suspended" ? (
        <CompanySuspensionToggle companyId={company.id} status={company.status} />
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-black/5 py-2 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-charcoal">{value}</span>
    </div>
  );
}
