"use client";

import { useState } from "react";
import { inviteWorker } from "@/app/company/actions";
import { Plus, Mail } from "lucide-react";

export function InviteWorkerForm({ companyId }: { companyId: string }) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await inviteWorker({
      companyId,
      fullName,
      inviteEmail: email,
      invitePhone: phone,
    });
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setFullName("");
    setEmail("");
    setPhone("");
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
        Invite worker
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card mb-4 rounded-2xl bg-warm-white p-4"
    >
      <input
        required
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Full name"
        className="mb-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
      />
      <div className="relative mb-2">
        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email — they'll sign in with this to accept"
          className="w-full rounded-lg border border-black/10 py-2 pl-8 pr-3 text-sm"
        />
      </div>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone (optional, for later)"
        className="mb-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
      />
      <p className="mb-2 text-xs text-muted">
        No invite email is actually sent yet — tell them the email you used
        here and they can sign in at the CrewMate login with it to accept.
      </p>
      {error && <p className="mb-2 text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          disabled={pending}
          className="rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send invite"}
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
