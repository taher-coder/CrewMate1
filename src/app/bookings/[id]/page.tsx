import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { requestStatus, jobStatus } from "@/lib/status";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, UserRound, CheckCircle2, MessageCircle } from "lucide-react";
import { CancelBookingButton } from "@/components/CancelBookingButton";

const TERMINAL_STATUSES = ["no_match", "cancelled"];

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: request } = await supabase
    .from("requests")
    .select(
      "id, status, description, time_type, created_at, no_match_reason, service_categories(name), service_problems(name)",
    )
    .eq("id", id)
    .single();

  if (!request) notFound();

  const { data: job } = await supabase
    .from("jobs")
    .select(
      "id, status, assigned_at, on_the_way_at, arrived_at, in_progress_at, completed_at, companies(display_name, legal_name), workers(full_name)",
    )
    .eq("request_id", id)
    .maybeSingle();

  const rStatus = requestStatus(request.status);

  return (
    <main className="min-h-screen bg-sage pb-10">
      <header className="flex items-center gap-3 bg-gradient-to-br from-forest to-forest-dark px-5 py-5 text-white">
        <Link
          href="/bookings"
          className="grid h-8 w-8 place-items-center rounded-full bg-white/10"
        >
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-sm font-semibold">Booking details</h1>
      </header>

      <section className="px-5 pt-5">
        <div className="card rounded-2xl bg-warm-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-lg font-bold text-charcoal">
              {request.service_categories?.name}
            </span>
            <StatusBadge label={rStatus.label} tone={rStatus.tone} />
          </div>
          <p className="text-sm text-muted">
            {request.service_problems?.name ?? "General issue"}
          </p>
          {request.description && (
            <p className="mt-3 rounded-xl bg-sage p-3 text-sm text-charcoal">
              {request.description}
            </p>
          )}
          {request.status === "no_match" && request.no_match_reason && (
            <p className="mt-3 rounded-xl bg-danger-bg p-3 text-sm text-danger">
              {request.no_match_reason}
            </p>
          )}
        </div>

        {job && (
          <div className="card mt-4 rounded-2xl bg-warm-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-charcoal">
                Job progress
              </h2>
              <StatusBadge
                label={jobStatus(job.status).label}
                tone={jobStatus(job.status).tone}
              />
            </div>

            <div className="mb-4 space-y-2 text-sm">
              <p className="flex items-center gap-2 text-charcoal">
                <Building2 size={15} className="text-muted" />
                {job.companies?.display_name ?? job.companies?.legal_name}
              </p>
              {job.workers?.full_name && (
                <p className="flex items-center gap-2 text-charcoal">
                  <UserRound size={15} className="text-muted" />
                  {job.workers.full_name}
                </p>
              )}
            </div>

            <Link
              href={`/jobs/${job.id}/messages`}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-forest/20 bg-forest/5 py-2.5 text-sm font-semibold text-forest"
            >
              <MessageCircle size={15} />
              Message
            </Link>

            <ol className="space-y-3 border-l-2 border-black/10 pl-4">
              <TimelineStep label="Assigned" at={job.assigned_at} />
              <TimelineStep label="On the way" at={job.on_the_way_at} />
              <TimelineStep label="Arrived" at={job.arrived_at} />
              <TimelineStep label="Work in progress" at={job.in_progress_at} />
              <TimelineStep label="Completed" at={job.completed_at} last />
            </ol>
          </div>
        )}

        {!job && request.status === "no_match" && (
          <div className="mt-4 rounded-2xl bg-danger-bg p-4 text-sm text-danger">
            No company is currently available for this request.
          </div>
        )}

        {!job && request.status !== "no_match" && (
          <div className="mt-4 rounded-2xl bg-amber-bg p-4 text-sm text-amber">
            We&apos;re finding a company for this request — this page
            updates automatically once one accepts.
          </div>
        )}

        {!TERMINAL_STATUSES.includes(request.status) && (
          <CancelBookingButton requestId={request.id} />
        )}
      </section>
    </main>
  );
}

function TimelineStep({
  label,
  at,
  last,
}: {
  label: string;
  at: string | null;
  last?: boolean;
}) {
  const reached = Boolean(at);
  return (
    <li className="relative">
      <span
        className={`absolute -left-[21px] top-0.5 grid h-3.5 w-3.5 place-items-center rounded-full ${
          reached ? "bg-emerald text-white" : "bg-black/15"
        }`}
      >
        {reached && last && <CheckCircle2 size={10} />}
      </span>
      <p
        className={`text-sm font-medium ${
          reached ? "text-charcoal" : "text-muted"
        }`}
      >
        {label}
      </p>
      {at && (
        <p className="text-xs text-muted">
          {new Date(at).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      )}
    </li>
  );
}
