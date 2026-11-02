"use client";

import { useState } from "react";
import { cancelBooking } from "@/app/bookings/actions";
import { XCircle } from "lucide-react";

export function CancelBookingButton({ requestId }: { requestId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setPending(true);
    const result = await cancelBooking(requestId);
    if (result.error) setError(result.error);
    setPending(false);
    setConfirming(false);
  }

  if (confirming) {
    return (
      <div className="card mt-4 rounded-2xl bg-warm-white p-4">
        <p className="mb-3 text-sm text-charcoal">
          Cancel this booking? This can&apos;t be undone.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            disabled={pending}
            className="flex-1 rounded-xl bg-danger py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Cancelling…" : "Yes, cancel"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="flex-1 rounded-xl border border-black/10 py-2.5 text-sm font-semibold text-charcoal"
          >
            Keep booking
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-danger/20 py-3 text-sm font-semibold text-danger"
    >
      <XCircle size={16} />
      Cancel booking
    </button>
  );
}
