"use client";

import { useState } from "react";
import { toggleWorkerSkill } from "@/app/company/actions";

export function WorkerSkillChips({
  workerId,
  categories,
  enabledCategoryIds,
}: {
  workerId: string;
  categories: { id: string; name: string }[];
  enabledCategoryIds: string[];
}) {
  const [enabled, setEnabled] = useState(new Set(enabledCategoryIds));
  const [pending, setPending] = useState<string | null>(null);

  async function toggle(categoryId: string) {
    setPending(categoryId);
    const next = !enabled.has(categoryId);
    const result = await toggleWorkerSkill(workerId, categoryId, next);
    if (!result.error) {
      setEnabled((prev) => {
        const copy = new Set(prev);
        next ? copy.add(categoryId) : copy.delete(categoryId);
        return copy;
      });
    }
    setPending(null);
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {categories.map((c) => {
        const active = enabled.has(c.id);
        return (
          <button
            key={c.id}
            onClick={() => toggle(c.id)}
            disabled={pending === c.id}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium disabled:opacity-50 ${
              active
                ? "border-emerald bg-sage text-forest"
                : "border-black/10 bg-white text-muted"
            }`}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
