"use client";

import { useState } from "react";
import { addAddress } from "@/app/profile/actions";
import { Plus } from "lucide-react";

export function AddAddressForm() {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("Home");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("Ahmedabad");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await addAddress({ label, line1, city });
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setLine1("");
    setOpen(false);
    setPending(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-black/15 py-3 text-sm font-semibold text-forest"
      >
        <Plus size={15} />
        Add address
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card rounded-2xl bg-warm-white p-4">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label — Home, Office…"
        className="mb-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
      />
      <textarea
        required
        value={line1}
        onChange={(e) => setLine1(e.target.value)}
        rows={2}
        placeholder="Flat / house no., building, street, area"
        className="mb-2 w-full rounded-lg border border-black/10 p-2 text-sm"
      />
      <input
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="mb-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
      />
      {error && <p className="mb-2 text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending}
          className="rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save address"}
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
