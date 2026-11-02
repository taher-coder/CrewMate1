"use client";

import { useState } from "react";
import { setWorkerStatus } from "@/app/internal-access/actions";

export function AdminWorkerStatusAction({
  workerId,
  status,
}: {
  workerId: string;
  status: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(next: "active" | "inactive") {
    setPending(true);
    const result = await setWorkerStatus(
      workerId,
      next,
      next === "inactive" ? "Suspended by admin" : undefined,
    );
    if (result.error) setError(result.error);
    setPending(false);
  }

  if (status === "invited" || status === "removed") return null;

  return (
    <div className="flex items-center gap-1.5">
      {status === "active" ? (
        <button
          disabled={pending}
          onClick={() => act("inactive")}
          className="rounded-lg border border-danger/20 px-2.5 py-1 text-xs font-semibold text-danger disabled:opacity-50"
        >
          Suspend
        </button>
      ) : (
        <button
          disabled={pending}
          onClick={() => act("active")}
          className="rounded-lg border border-black/10 px-2.5 py-1 text-xs font-semibold text-charcoal disabled:opacity-50"
        >
          Reactivate
        </button>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
