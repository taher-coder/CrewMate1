"use client";

import { useState } from "react";
import { createRequest } from "@/app/book/actions";
import {
  ChevronLeft,
  Check,
  MapPin,
  Clock,
  CalendarClock,
  FileText,
} from "lucide-react";

type Problem = { id: string; name: string };
type Category = { id: string; name: string; slug: string };

export function BookingForm({
  category,
  problems,
}: {
  category: Category;
  problems: Problem[];
}) {
  const [step, setStep] = useState(1);
  const [problemId, setProblemId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLabel, setAddressLabel] = useState("Home");
  const [timeType, setTimeType] = useState<"asap" | "scheduled">("asap");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 4;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const result = await createRequest({
      categoryId: category.id,
      problemId,
      description,
      addressLine1,
      addressLabel,
      timeType,
      scheduledAt: null,
    });
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 pb-10">
      <div className="flex items-center gap-3 py-5">
        {step > 1 ? (
          <button
            onClick={() => setStep(step - 1)}
            className="grid h-9 w-9 place-items-center rounded-full bg-warm-white text-charcoal shadow-sm"
          >
            <ChevronLeft size={18} />
          </button>
        ) : (
          <div className="h-9 w-9" />
        )}
        <div className="flex flex-1 gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                i < step ? "bg-emerald" : "bg-black/10"
              }`}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <section key="1" className="fade-up">
          <h1 className="mb-1 text-xl font-bold text-charcoal">
            {category.name}
          </h1>
          <p className="mb-5 text-sm text-muted">
            What&apos;s the issue? Pick the closest match.
          </p>
          <div className="space-y-2">
            {problems.map((p) => (
              <SelectCard
                key={p.id}
                label={p.name}
                selected={problemId === p.id}
                onClick={() => setProblemId(p.id)}
              />
            ))}
            <SelectCard
              label="Something else"
              selected={problemId === null}
              onClick={() => setProblemId(null)}
            />
          </div>
          <PrimaryButton className="mt-6" onClick={() => setStep(2)}>
            Continue
          </PrimaryButton>
        </section>
      )}

      {step === 2 && (
        <section key="2" className="fade-up">
          <div className="mb-5 flex items-center gap-2">
            <IconBadge icon={FileText} />
            <div>
              <h1 className="text-xl font-bold text-charcoal">
                Describe the problem
              </h1>
              <p className="text-sm text-muted">Optional, but it helps.</p>
            </div>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="E.g. the tap under the kitchen sink has been dripping for two days…"
            className="w-full rounded-2xl border border-black/10 bg-white p-4 text-sm"
          />
          <PrimaryButton className="mt-6" onClick={() => setStep(3)}>
            Continue
          </PrimaryButton>
        </section>
      )}

      {step === 3 && (
        <section key="3" className="fade-up">
          <div className="mb-5 flex items-center gap-2">
            <IconBadge icon={MapPin} />
            <div>
              <h1 className="text-xl font-bold text-charcoal">
                Service address
              </h1>
              <p className="text-sm text-muted">
                Where should the professional come?
              </p>
            </div>
          </div>
          <label className="mb-1.5 block text-xs font-semibold text-muted">
            Label
          </label>
          <input
            value={addressLabel}
            onChange={(e) => setAddressLabel(e.target.value)}
            placeholder="Home, Office…"
            className="mb-4 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm"
          />
          <label className="mb-1.5 block text-xs font-semibold text-muted">
            Full address
          </label>
          <textarea
            required
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            rows={3}
            placeholder="Flat / house no., building, street, area"
            className="w-full rounded-2xl border border-black/10 bg-white p-4 text-sm"
          />
          <div className="mt-4 rounded-xl bg-amber-bg px-4 py-3 text-xs text-amber">
            Map-based location picking isn&apos;t wired up yet — this MVP
            saves the address text only, pinned to central Ahmedabad.
          </div>
          <PrimaryButton
            className="mt-6"
            disabled={!addressLine1}
            onClick={() => setStep(4)}
          >
            Continue
          </PrimaryButton>
        </section>
      )}

      {step === 4 && (
        <section key="4" className="fade-up">
          <h1 className="mb-1 text-xl font-bold text-charcoal">
            Review your request
          </h1>
          <p className="mb-5 text-sm text-muted">
            Check the details, then submit. You can cancel anytime before a
            company accepts.
          </p>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <TimeOption
              icon={Clock}
              label="As soon as possible"
              selected={timeType === "asap"}
              onClick={() => setTimeType("asap")}
            />
            <TimeOption
              icon={CalendarClock}
              label="Schedule later"
              selected={timeType === "scheduled"}
              onClick={() => setTimeType("scheduled")}
            />
          </div>

          <div className="card space-y-2.5 rounded-2xl bg-warm-white p-4 text-sm">
            <Row label="Service" value={category.name} />
            <Row
              label="Issue"
              value={
                problems.find((p) => p.id === problemId)?.name ?? "Other"
              }
            />
            <Row label="Address" value={addressLine1 || "—"} />
            <Row
              label="Pricing"
              value="Quote from the company after review"
            />
          </div>

          {error && <p className="mt-4 text-sm text-danger">{error}</p>}

          <PrimaryButton
            className="mt-6"
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Submitting…" : "Submit request"}
          </PrimaryButton>
        </section>
      )}
    </div>
  );
}

function SelectCard({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left text-sm font-medium ${
        selected
          ? "border-emerald bg-sage text-forest"
          : "border-black/10 bg-white text-charcoal hover:border-black/20"
      }`}
    >
      {label}
      {selected && (
        <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald text-white">
          <Check size={13} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function TimeOption({
  icon: Icon,
  label,
  selected,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-xl border py-4 text-xs font-semibold ${
        selected
          ? "border-emerald bg-sage text-forest"
          : "border-black/10 bg-white text-charcoal"
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

function IconBadge({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <div className="grid h-10 w-10 place-items-center rounded-xl bg-sage text-forest">
      <Icon size={18} />
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl bg-forest py-3.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,61,40,0.2)] hover:bg-forest-dark disabled:opacity-50 disabled:shadow-none ${className}`}
    >
      {children}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-black/5 py-1.5 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-charcoal">{value}</span>
    </div>
  );
}
