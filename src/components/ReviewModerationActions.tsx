"use client";

import { useState } from "react";
import { moderateReview } from "@/app/internal-access/actions";

export function ReviewModerationActions({
  reviewId,
  moderationState,
}: {
  reviewId: string;
  moderationState: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  async function act(action: "hide" | "restore") {
    setPending(true);
    const result = await moderateReview(reviewId, action, reason || undefined);
    if (result.error) setError(result.error);
    setPending(false);
  }

  return (
    <div className="mt-3 border-t border-black/5 pt-3">
      {moderationState !== "hidden" ? (
        <>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for hiding (required)"
            className="mb-2 w-full rounded-lg border border-black/10 px-2 py-1.5 text-xs"
          />
          <button
            disabled={pending || !reason}
            onClick={() => act("hide")}
            className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Hide review
          </button>
        </>
      ) : (
        <button
          disabled={pending}
          onClick={() => act("restore")}
          className="rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          Restore review
        </button>
      )}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
