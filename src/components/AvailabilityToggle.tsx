"use client";

import { useState } from "react";
import { setAvailability } from "@/app/worker/actions";

export function AvailabilityToggle({ initial }: { initial: boolean }) {
  const [isAvailable, setIsAvailable] = useState(initial);
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const next = !isAvailable;
    const result = await setAvailability(next);
    if (!result.error) setIsAvailable(next);
    setPending(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
        isAvailable ? "bg-success-bg text-success" : "bg-black/5 text-muted"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          isAvailable ? "bg-success" : "bg-muted"
        }`}
      />
      {isAvailable ? "Available" : "Offline"}
    </button>
  );
}
