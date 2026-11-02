"use client";

import { useState } from "react";
import { updateSupportTicketStatus } from "@/app/internal-access/actions";

const ACTIONS: { status: "investigating" | "waiting" | "resolved" | "closed"; label: string }[] = [
  { status: "investigating", label: "Start investigating" },
  { status: "waiting", label: "Waiting on them" },
  { status: "resolved", label: "Mark resolved" },
  { status: "closed", label: "Close" },
];

export function SupportTicketActions({ ticketId }: { ticketId: string }) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(status: (typeof ACTIONS)[number]["status"]) {
    setPending(status);
    const result = await updateSupportTicketStatus(ticketId, status);
    if (result.error) setError(result.error);
    setPending(null);
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {ACTIONS.map((a) => (
        <button
          key={a.status}
          disabled={pending !== null}
          onClick={() => act(a.status)}
          className="rounded-lg border border-black/10 px-2.5 py-1 text-xs font-medium text-charcoal disabled:opacity-50"
        >
          {pending === a.status ? "…" : a.label}
        </button>
      ))}
      {error && <p className="w-full text-xs text-danger">{error}</p>}
    </div>
  );
}
