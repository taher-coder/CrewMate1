"use client";

import { useState } from "react";
import { applyAsCompany } from "@/app/become-a-partner/actions";

export function ApplyAsCompanyForm() {
  const [legalName, setLegalName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await applyAsCompany({ legalName, displayName, city, phone, email, address });
    // A successful call redirects server-side and never returns here.
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-3 rounded-2xl bg-warm-white p-5">
      <Field label="Business / legal name *">
        <input
          required
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          placeholder="E.g. Shree Plumbing Services"
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Display name">
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="How customers will see you (defaults to legal name)"
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="City *">
        <input
          required
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Ahmedabad"
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Phone">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Business contact number"
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Business contact email"
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
      </Field>

      <Field label="Address">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Office / workshop address"
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
      </Field>

      {error && <p className="text-xs text-danger">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-forest py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit application"}
      </button>
      <p className="text-center text-[11px] text-muted">
        Our team will review your application and notify you once approved.
      </p>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-muted">{label}</label>
      {children}
    </div>
  );
}
