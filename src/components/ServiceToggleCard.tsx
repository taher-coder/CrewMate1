"use client";

import { useState } from "react";
import { toggleService } from "@/app/company/actions";
import { Wrench, Zap, Snowflake } from "lucide-react";

const ICON: Record<string, React.ElementType> = {
  plumbing: Wrench,
  electrical: Zap,
  "ac-repair": Snowflake,
};

export function ServiceToggleCard({
  companyId,
  category,
  enabled: initialEnabled,
}: {
  companyId: string;
  category: { id: string; name: string; slug: string };
  enabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState(false);
  const Icon = ICON[category.slug] ?? Wrench;

  async function handleToggle() {
    setPending(true);
    const next = !enabled;
    const result = await toggleService(companyId, category.id, next);
    if (!result.error) setEnabled(next);
    setPending(false);
  }

  return (
    <div className="card rounded-2xl bg-warm-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`grid h-10 w-10 place-items-center rounded-xl ${
              enabled ? "bg-sage text-forest" : "bg-black/5 text-muted"
            }`}
          >
            <Icon size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-charcoal">
              {category.name}
            </p>
            <p className="text-xs text-muted">
              {enabled ? "Active — receiving requests" : "Not offered"}
            </p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={pending}
          className={`relative h-7 w-12 rounded-full transition-colors ${
            enabled ? "bg-emerald" : "bg-black/15"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      {enabled && (
        <p className="mt-3 border-t border-black/5 pt-3 text-xs text-muted">
          Pricing is quote-based for now — per-category catalog pricing
          isn&apos;t in the schema yet.
        </p>
      )}
    </div>
  );
}
