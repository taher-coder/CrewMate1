"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptWorkerInvite } from "@/app/onboarding/actions";
import { HardHat, Check, X } from "lucide-react";

export function InviteAcceptCard({ companyName }: { companyName: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setPending(true);
    const result = await acceptWorkerInvite();
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    router.push("/worker");
  }

  function decline() {
    router.push("/");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-forest-dark px-4">
      <div className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-emerald/25 blur-3xl" />

      <div className="relative w-full max-w-sm rounded-3xl bg-warm-white p-8 shadow-2xl fade-up">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-sage text-forest">
          <HardHat size={22} />
        </div>
        <h1 className="mb-2 text-center text-lg font-semibold text-charcoal">
          You&apos;ve been invited
        </h1>
        <p className="mb-6 text-center text-sm text-muted">
          <strong>{companyName}</strong> invited you to join CrewMate as a
          worker. Accepting switches your account to the worker app.
        </p>

        {error && <p className="mb-4 text-sm text-danger">{error}</p>}

        <button
          onClick={accept}
          disabled={pending}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-forest py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Check size={16} />
          {pending ? "Accepting…" : "Accept invitation"}
        </button>
        <button
          onClick={decline}
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 py-3 text-sm font-semibold text-charcoal disabled:opacity-60"
        >
          <X size={16} />
          Not now — continue as a customer
        </button>
      </div>
    </main>
  );
}
