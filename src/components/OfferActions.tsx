"use client";

import { useState } from "react";
import { respondToOffer } from "@/app/company/actions";

export function OfferActions({ offerId }: { offerId: string }) {
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setPending(true);
    const result = await respondToOffer(offerId, "accepted");
    if (result.error) setError(result.error);
    setPending(false);
  }

  async function reject() {
    setPending(true);
    const result = await respondToOffer(offerId, "rejected", reason);
    if (result.error) setError(result.error);
    setPending(false);
    setShowReject(false);
  }

  if (showReject) {
    return (
      <div className="mt-2 rounded-xl border border-black/10 bg-white p-3">
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mb-2 w-full rounded-lg border border-black/10 px-2 py-1.5 text-xs"
        >
          <option value="">Reason for rejecting…</option>
          <option value="outside_coverage">Outside our service area</option>
          <option value="no_capacity">No capacity right now</option>
          <option value="skill_mismatch">Not a service we offer</option>
          <option value="other">Other</option>
        </select>
        <div className="flex gap-2">
          <button
            disabled={!reason || pending}
            onClick={reject}
            className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Confirm reject
          </button>
          <button
            onClick={() => setShowReject(false)}
            className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold"
          >
            Cancel
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-2 flex gap-2">
      <button
        onClick={accept}
        disabled={pending}
        className="rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
      >
        Accept
      </button>
      <button
        onClick={() => setShowReject(true)}
        disabled={pending}
        className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-charcoal"
      >
        Reject
      </button>
      {error && <p className="ml-2 self-center text-xs text-danger">{error}</p>}
    </div>
  );
}
