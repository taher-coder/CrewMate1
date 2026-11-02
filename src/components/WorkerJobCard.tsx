"use client";

import { useState } from "react";
import { advanceMyJob } from "@/app/worker/actions";
import { StatusBadge } from "@/components/StatusBadge";
import { jobStatus } from "@/lib/status";
import { MapPin, Navigation, DoorOpen, Wrench, CheckCircle2, MessageCircle } from "lucide-react";
import Link from "next/link";

const NEXT_LABEL: Record<string, string> = {
  assigned: "On my way",
  on_the_way: "Confirm arrival",
  arrived: "Start work",
  in_progress: "Submit completion",
};

const NEXT_ICON: Record<string, React.ElementType> = {
  assigned: Navigation,
  on_the_way: DoorOpen,
  arrived: Wrench,
  in_progress: CheckCircle2,
};

export function WorkerJobCard({
  job,
}: {
  job: {
    id: string;
    status: string;
    requests: {
      description: string | null;
      service_categories: { name: string } | null;
      service_problems: { name: string } | null;
      addresses: { line1: string } | null;
    } | null;
  };
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const s = jobStatus(job.status);
  const nextLabel = NEXT_LABEL[job.status];
  const NextIcon = NEXT_ICON[job.status];

  async function handleAdvance() {
    setPending(true);
    const result = await advanceMyJob(job.id, job.status);
    if (result.error) setError(result.error);
    setPending(false);
  }

  return (
    <div className="card rounded-2xl bg-warm-white p-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-charcoal">
          {job.requests?.service_categories?.name} —{" "}
          {job.requests?.service_problems?.name ?? "General issue"}
        </span>
        <StatusBadge label={s.label} tone={s.tone} />
      </div>
      {job.requests?.addresses?.line1 && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted">
          <MapPin size={12} />
          {job.requests.addresses.line1}
        </p>
      )}
      {job.requests?.description && (
        <p className="mt-2 rounded-lg bg-sage p-2.5 text-xs text-charcoal">
          {job.requests.description}
        </p>
      )}

      {nextLabel && (
        <button
          onClick={handleAdvance}
          disabled={pending}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-forest py-2.5 text-sm font-semibold text-white shadow-[0_8px_16px_rgba(15,61,40,0.2)] hover:bg-forest-dark disabled:opacity-60"
        >
          {NextIcon && <NextIcon size={16} />}
          {pending ? "Updating…" : nextLabel}
        </button>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      <Link
        href={`/jobs/${job.id}/messages`}
        className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-forest/20 bg-forest/5 py-2 text-xs font-semibold text-forest"
      >
        <MessageCircle size={13} />
        Message
      </Link>
    </div>
  );
}
