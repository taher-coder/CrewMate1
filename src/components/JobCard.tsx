"use client";

import { useState } from "react";
import { assignWorkerToJob } from "@/app/company/actions";
import { StatusBadge } from "@/components/StatusBadge";
import { jobStatus } from "@/lib/status";
import { UserRound, MessageCircle } from "lucide-react";
import Link from "next/link";

/**
 * Company's view of a job: assign a worker, and watch its status.
 * Advancing the status (on the way / arrived / in progress / completed)
 * is done by the WORKER in the worker app, not here — see the note in
 * app/company/actions.ts for why.
 */
export function JobCard({
  job,
  availableWorkers,
}: {
  job: {
    id: string;
    status: string;
    worker_id: string | null;
    requests: {
      category_id?: string;
      service_categories: { name: string } | null;
    } | null;
    workers: { full_name: string } | null;
  };
  availableWorkers: { id: string; full_name: string }[];
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const s = jobStatus(job.status);

  async function handleAssign(workerId: string) {
    if (!workerId) return;
    setPending(true);
    const result = await assignWorkerToJob(job.id, workerId);
    if (result.error) setError(result.error);
    setPending(false);
  }

  return (
    <div className="card rounded-2xl bg-warm-white p-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-charcoal">
          {job.requests?.service_categories?.name ?? "Job"}
        </span>
        <StatusBadge label={s.label} tone={s.tone} />
      </div>

      {!job.worker_id ? (
        availableWorkers.length > 0 ? (
          <div className="mt-2">
            <select
              disabled={pending}
              onChange={(e) => handleAssign(e.target.value)}
              defaultValue=""
              className="w-full rounded-lg border border-black/10 px-2 py-1.5 text-xs"
            >
              <option value="" disabled>
                Assign a worker…
              </option>
              {availableWorkers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.full_name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="mt-2 rounded-lg bg-amber-bg px-3 py-2 text-xs text-amber">
            No active worker has this skill yet — add it on the Workers
            page before you can assign this job.
          </p>
        )
      ) : (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
          <UserRound size={13} />
          Assigned to {job.workers?.full_name} — status updates come from
          the worker&apos;s app.
        </p>
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
