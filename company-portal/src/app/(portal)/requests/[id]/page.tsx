import { notFound, redirect } from "next/navigation";
import { getCompanyContext } from "@/lib/data/company-context";
import { getOfferDetail } from "@/lib/data/requests";
import { OfferActions } from "./offer-actions";

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getCompanyContext();
  if (!ctx) redirect("/apply");

  const { id } = await params;
  const offer = await getOfferDetail(id, ctx.company.id);
  if (!offer) notFound();

  const req: any = offer.requests;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {req?.service_categories?.name ?? "Service request"}
        </h1>
        <p className="text-sm text-neutral-500">
          {req?.service_problems?.name ?? "No specific problem selected"}
        </p>
      </div>

      <Section title="Customer">
        <Row label="Name" value={req?.profiles?.full_name ?? "—"} />
        <Row label="Phone" value={req?.profiles?.phone ?? "—"} />
      </Section>

      <Section title="Problem description">
        <p className="text-sm text-neutral-700">{req?.description || "No description provided."}</p>
      </Section>

      {req?.request_media?.length > 0 && (
        <Section title="Photos / videos">
          <ul className="text-sm text-neutral-600">
            {req.request_media.map((m: any) => (
              <li key={m.id}>{m.media_type}: {m.file_path}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Location">
        <Row label="Address" value={[req?.addresses?.line1, req?.addresses?.line2, req?.addresses?.city, req?.addresses?.state, req?.addresses?.postal_code].filter(Boolean).join(", ") || "—"} />
      </Section>

      <Section title="Appointment">
        <Row
          label="Time"
          value={
            req?.time_type === "asap"
              ? "As soon as possible"
              : req?.scheduled_at
              ? new Date(req.scheduled_at).toLocaleString()
              : "Scheduled (time not set)"
          }
        />
      </Section>

      <OfferActions offerId={offer.id} status={offer.status} rejectionReason={offer.rejection_reason} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right text-neutral-900">{value}</span>
    </div>
  );
}
