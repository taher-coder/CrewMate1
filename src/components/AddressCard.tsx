"use client";

import { useState } from "react";
import { deleteAddress, setDefaultAddress } from "@/app/profile/actions";
import { Star, Trash2 } from "lucide-react";

export function AddressCard({
  address,
}: {
  address: { id: string; label: string | null; line1: string; city: string; is_default: boolean };
}) {
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this address?")) return;
    setPending(true);
    await deleteAddress(address.id);
    setPending(false);
  }

  async function handleSetDefault() {
    setPending(true);
    await setDefaultAddress(address.id);
    setPending(false);
  }

  return (
    <div className="card rounded-2xl bg-warm-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-charcoal">
              {address.label || "Address"}
            </p>
            {address.is_default && (
              <span className="rounded-full bg-sage px-2 py-0.5 text-[10px] font-semibold text-forest">
                Default
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">
            {address.line1}, {address.city}
          </p>
        </div>
        <button onClick={handleDelete} disabled={pending} className="text-muted">
          <Trash2 size={15} />
        </button>
      </div>
      {!address.is_default && (
        <button
          onClick={handleSetDefault}
          disabled={pending}
          className="mt-2 flex items-center gap-1 text-xs font-semibold text-forest"
        >
          <Star size={12} />
          Set as default
        </button>
      )}
    </div>
  );
}
