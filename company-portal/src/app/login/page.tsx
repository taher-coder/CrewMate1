"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Sec 5.1 / 6: company owners sign in the same way customers do (phone OTP
// or Google) — there is no "I am a company" checkbox at signup. Whether
// someone lands on the application form or the dashboard is decided by
// whether a company_members row exists for them, checked after login.
//
// Google is the primary path for now because phone OTP needs a Twilio
// account wired into Supabase's Auth settings, which hasn't happened yet —
// showing it as the default option would just produce a confusing dead
// button. It's still here, collapsed, for whenever Twilio is configured.
export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [showPhone, setShowPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStage("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  async function signInWithGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  // TEMPORARY: a real, pre-seeded account (email/password auth, which works
  // out of the box with no external provider) so the app is clickable right
  // now without Twilio or Google OAuth configured. This is a real signed-in
  // session — RLS, the dashboard's live queries, and the apply flow all
  // behave exactly as they would for any other user. Remove this button
  // once Google/phone are actually configured and tested.
  async function signInAsDemo() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: "demo@crewmate.app",
      password: "CrewmateDemo2026!",
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">CrewMate for Business</h1>
          <p className="mt-1 text-sm text-neutral-500">Sign in to manage your company on CrewMate.</p>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={signInAsDemo}
          disabled={loading}
          className="w-full rounded-md bg-amber-500 px-3 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Continue with demo account"}
        </button>
        <p className="text-center text-[11px] text-neutral-400">
          Temporary — skips Google/phone setup. Real session, real data.
        </p>

        <div className="relative py-1 text-center text-xs text-neutral-400">
          <span className="bg-neutral-50 px-2">or</span>
          <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-neutral-200" />
        </div>

        <button
          onClick={signInWithGoogle}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Continue with Google
        </button>

        {!showPhone ? (
          <button
            onClick={() => setShowPhone(true)}
            className="w-full text-center text-xs text-neutral-400 hover:underline"
          >
            Use phone number instead
          </button>
        ) : (
          <div className="space-y-3 border-t border-neutral-200 pt-4">
            {stage === "phone" ? (
              <form onSubmit={sendOtp} className="space-y-3">
                <label className="block text-sm font-medium text-neutral-700">
                  Phone number
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  {loading ? "Sending code…" : "Send code"}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="space-y-3">
                <label className="block text-sm font-medium text-neutral-700">
                  Enter the code sent to {phone}
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  {loading ? "Verifying…" : "Verify & sign in"}
                </button>
                <button
                  type="button"
                  onClick={() => setStage("phone")}
                  className="w-full text-xs text-neutral-500 hover:underline"
                >
                  Use a different number
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
