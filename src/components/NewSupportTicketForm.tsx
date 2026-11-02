"use client";

import { useState } from "react";
import { createSupportTicket } from "@/app/company/actions";
import { Plus } from "lucide-react";

const CATEGORIES = [
  "Payment issue",
  "Dispatch / matching issue",
  "Worker issue",
  "Account / verification",
  "Other",
];

export function NewSupportTicketForm({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await createSupportTicket({ companyId, category, description });
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setDescription("");
    setOpen(false);
    setPending(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-4 flex items-center gap-1.5 rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white"
      >
        <Plus size={15} />
        New support case
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card mb-4 rounded-2xl bg-warm-white p-4">
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="mb-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <textarea
        required
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="What's going on?"
        className="mb-2 w-full rounded-lg border border-black/10 p-2 text-sm"
      />
      {error && <p className="mb-2 text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending}
          className="rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          Submit
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
