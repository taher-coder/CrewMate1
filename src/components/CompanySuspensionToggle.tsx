"use client";

import { useState } from "react";
import { setCompanySuspension } from "@/app/internal-access/actions";

export function CompanySuspensionToggle({
  companyId,
  status,
}: {
  companyId: string;
  status: string;
}) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSuspended = status === "suspended";

  async function act() {
    setPending(true);
    const result = await setCompanySuspension(
      companyId,
      !isSuspended,
      !isSuspended ? reason : undefined,
    );
    if (result.error) setError(result.error);
    setPending(false);
  }

  return (
    <div className="card mt-4 rounded-2xl bg-warm-white p-5">
      <h2 className="mb-2 text-sm font-semibold text-charcoal">
        Account status
      </h2>
      {!isSuspended && (
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for suspending (required)"
          className="mb-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
      )}
      <button
        disabled={pending || (!isSuspended && !reason)}
        onClick={act}
        className={`rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 ${
          isSuspended ? "bg-forest" : "bg-danger"
        }`}
      >
        {isSuspended ? "Reactivate company" : "Suspend company"}
      </button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
