"use client";

import { useState } from "react";
import { updateProfile } from "@/app/profile/actions";
import { Pencil, Check } from "lucide-react";

export function ProfileEditForm({
  initialName,
  initialPhone,
}: {
  initialName: string;
  initialPhone: string;
}) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setPending(true);
    const result = await updateProfile({ fullName, phone });
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setPending(false);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="card rounded-2xl bg-warm-white p-5">
        <Row label="Name" value={fullName || "Not set yet"} />
        <Row label="Phone" value={phone || "Not set yet"} />
        <button
          onClick={() => setEditing(true)}
          className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-forest"
        >
          <Pencil size={12} />
          Edit details
        </button>
      </div>
    );
  }

  return (
    <div className="card rounded-2xl bg-warm-white p-5">
      <label className="mb-1 block text-xs font-semibold text-muted">
        Full name
      </label>
      <input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        className="mb-3 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
      />
      <label className="mb-1 block text-xs font-semibold text-muted">
        Phone
      </label>
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="For reference only — sign-in is still email based"
        className="mb-3 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
      />
      {error && <p className="mb-2 text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          <Check size={13} />
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-charcoal"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-black/5 py-2.5 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-charcoal">{value}</span>
    </div>
  );
}
