"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, MailCheck, Wrench, Zap, Snowflake } from "lucide-react";

/**
 * NOTE: the product spec calls for phone-number OTP sign-in. That needs an
 * SMS provider (MSG91/Twilio) configured on the Supabase Auth project,
 * which hasn't been set up yet. Email OTP is wired here instead because
 * it's real and testable today — swap the `signInWithOtp({ phone })` call
 * in once an SMS provider is configured. We don't fake a phone flow that
 * doesn't actually send anything, per the workflow spec's "never
 * fabricate" rule.
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-forest-dark px-4">
      {/* decorative glow */}
      <div className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-emerald/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald/15 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="mb-5 flex items-center justify-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald to-emerald-light text-base font-bold text-white shadow-[0_8px_20px_rgba(31,157,107,0.45)]">
            CM
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            CrewMate
          </span>
        </div>

        <div className="mb-6 flex items-center justify-center gap-5 text-white/40">
          <Wrench size={16} />
          <Zap size={16} />
          <Snowflake size={16} />
        </div>

        <div className="rounded-3xl bg-warm-white p-8 shadow-2xl fade-up">
          {status === "sent" ? (
            <div className="text-center">
              <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-success-bg text-success">
                <MailCheck size={22} />
              </div>
              <h1 className="mb-2 text-lg font-semibold text-charcoal">
                Check your email
              </h1>
              <p className="text-sm text-muted">
                We sent a sign-in link to <strong>{email}</strong>. Open it
                on this device to continue.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h1 className="mb-1 text-xl font-semibold text-charcoal">
                Welcome back
              </h1>
              <p className="mb-6 text-sm text-muted">
                Trusted plumbing, electrical and AC repair — booked in
                minutes, in Ahmedabad.
              </p>
              <label className="mb-1.5 block text-xs font-semibold text-muted">
                Email address
              </label>
              <div className="relative mb-5">
                <Mail
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-black/10 bg-white py-3 pl-10 pr-4 text-sm"
                />
              </div>
              {status === "error" && (
                <p className="mb-4 text-sm text-danger">{errorMessage}</p>
              )}
              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full rounded-xl bg-forest py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(15,61,40,0.25)] hover:bg-forest-dark disabled:opacity-60"
              >
                {status === "sending" ? "Sending link…" : "Continue"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-white/40">
          By continuing you agree to CrewMate&apos;s terms &amp; privacy
          policy.
        </p>
      </div>
    </main>
  );
}
