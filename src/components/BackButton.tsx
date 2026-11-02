"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="grid h-8 w-8 place-items-center rounded-full bg-white/10"
      aria-label="Go back"
    >
      <ArrowLeft size={16} />
    </button>
  );
}
