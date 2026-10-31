"use client";

import { useActionState, useState } from "react";
import { acceptOffer, rejectOffer, type OfferActionState } from "../actions";

const initial: OfferActionState = {};

export function OfferActions({
  offerId,
  status,
  rejectionReason,
}: {
  offerId: string;
  status: string;
  rejectionReason: string | null;
}) {
  const [acceptState, acceptAction, acceptPending] = useActionState(acceptOffer, initial);
  const [rejectState, rejectAction, rejectPending] = useActionState(rejectOffer, initial);
  const [showReject, setShowReject] = useState(false);

  if (status !== "pending") {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
        This request has already been <span className="font-medium">{status}</span>.
        {status === "rejected" && rejectionReason && (
          <div className="mt-1 text-xs text-neutral-500">Reason: {rejectionReason}</div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
      {(acceptState.error || rejectState.error) && (
        <p className="text-sm text-red-600">{acceptState.error || rejectState.error}</p>
      )}

      {!showReject ? (
        <div className="flex gap-3">
          <form action={acceptAction} className="flex-1">
            <input type="hidden" name="offer_id" value={offerId} />
            <button
              type="submit"
              disabled={acceptPending}
              className="w-full rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {acceptPending ? "Accepting…" : "Accept request"}
            </button>
          </form>
          <button
            onClick={() => setShowReject(true)}
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Reject
          </button>
        </div>
      ) : (
        <form action={rejectAction} className="space-y-2">
          <input type="hidden" name="offer_id" value={offerId} />
          <label className="block text-sm font-medium text-neutral-700">
            Reason for rejecting
            <textarea
              name="reason"
              required
              rows={2}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={rejectPending}
              className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {rejectPending ? "Rejecting…" : "Confirm reject"}
            </button>
            <button
              type="button"
              onClick={() => setShowReject(false)}
              className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
