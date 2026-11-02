"use client";

import { useState } from "react";
import { decideApplication } from "@/app/internal-access/actions";

export function ApplicationDecision({ applicationId }: { applicationId: string }) {
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "verified" | "rejected" | "info_requested") {
    setPending(true);
    const result = await decideApplication(applicationId, decision, notes);
    if (result.error) setError(result.error);
    setPending(false);
  }

  return (
    <div className="mt-5 rounded-2xl bg-warm-white p-4 shadow-sm">
      <label className="mb-1 block text-xs font-semibold text-muted">
        Reviewer notes (shown to the company if you request more info or reject)
      </label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        className="mb-3 w-full rounded-lg border border-black/10 p-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          disabled={pending}
          onClick={() => decide("verified")}
          className="rounded-lg bg-forest px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          Approve
        </button>
        <button
          disabled={pending || !notes}
          onClick={() => decide("info_requested")}
          className="rounded-lg bg-amber px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          Request more info
        </button>
        <button
          disabled={pending || !notes}
          onClick={() => decide("rejected")}
          className="rounded-lg bg-danger px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          Reject
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
