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
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setErrorMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    // On success the browser navigates away to Google immediately, so
    // there's nothing more to do here. We only ever see `error` locally.
    if (error) {
      setErrorMessage(error.message);
      setGoogleLoading(false);
    }
  }

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
            <>
              <h1 className="mb-1 text-xl font-semibold text-charcoal">
                Welcome back
              </h1>
              <p className="mb-6 text-sm text-muted">
                Trusted plumbing, electrical and AC repair — booked in
                minutes, in Ahmedabad.
              </p>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="mb-5 flex w-full items-center justify-center gap-2.5 rounded-xl border border-black/10 bg-white py-3 text-sm font-semibold text-charcoal shadow-sm disabled:opacity-60"
              >
                <GoogleIcon />
                {googleLoading ? "Redirecting…" : "Continue with Google"}
              </button>

              <div className="mb-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-black/10" />
                <span className="text-xs font-medium text-muted">or</span>
                <div className="h-px flex-1 bg-black/10" />
              </div>

              <form onSubmit={handleSubmit}>
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
              {errorMessage && (
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
            </>
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.5 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.5 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6c-2.1 1.5-4.8 2.5-7.7 2.5-5.2 0-9.6-3.3-11.3-7.9l-6.6 5.1C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.6 5.6C40.9 36.6 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}
