"use client";

import { useState } from "react";
import { respondToReview } from "@/app/company/actions";
import { MessageSquareReply } from "lucide-react";

export function ReviewReplyForm({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    const result = await respondToReview(reviewId, text);
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setOpen(false);
    setPending(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-forest"
      >
        <MessageSquareReply size={13} />
        Reply to review
      </button>
    );
  }

  return (
    <div className="mt-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Thank the customer, or clarify what happened…"
        className="w-full rounded-lg border border-black/10 p-2 text-xs"
      />
      <div className="mt-1.5 flex gap-2">
        <button
          disabled={pending || !text}
          onClick={submit}
          className="rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          Post reply
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold"
        >
          Cancel
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
