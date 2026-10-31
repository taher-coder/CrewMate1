"use client";

import { useActionState } from "react";
import { submitApplication, type ApplyFormState } from "./actions";

const initialState: ApplyFormState = {};

export default function ApplyPage() {
  const [state, formAction, pending] = useActionState(submitApplication, initialState);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Apply to join CrewMate</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Tell us about your business. An admin will review this before your company can
        start receiving requests. (Document upload for registration/PAN/GST comes after
        the initial application is created.)
      </p>

      {state.error && (
        <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <form action={formAction} className="mt-6 space-y-4">
        <Field label="Business / legal name" name="legal_name" required />
        <div className="grid grid-cols-2 gap-4">
          <Field label="City" name="city" required />
          <Field label="Years in operation" name="years_operation" type="number" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Business phone" name="phone" type="tel" />
          <Field label="Business email" name="email" type="email" />
        </div>
        <Field label="Website (optional)" name="website" />
        <Field label="Business address" name="address" as="textarea" />

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Submit application"}
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  as = "input",
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  as?: "input" | "textarea";
}) {
  return (
    <label className="block text-sm font-medium text-neutral-700">
      {label}
      {as === "textarea" ? (
        <textarea
          name={name}
          required={required}
          rows={2}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
      ) : (
        <input
          type={type}
          name={name}
          required={required}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
      )}
    </label>
  );
}
