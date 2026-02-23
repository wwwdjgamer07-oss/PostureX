"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const detectRecoverySession = async () => {
      const hash = typeof window !== "undefined"
        ? new URLSearchParams(window.location.hash.replace(/^#/, ""))
        : new URLSearchParams();

      const hashError = hash.get("error");
      const hashErrorCode = hash.get("error_code");
      if (hashErrorCode === "otp_expired" || hashError === "access_denied") {
        setError("Verification link expired. Request a new password reset email.");
        setCheckingSession(false);
        return;
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        if (sessionError) {
          setError(sessionError.message);
          setCheckingSession(false);
          return;
        }
      }

      for (let attempt = 0; attempt < 12; attempt += 1) {
        const { data } = await supabase.auth.getSession();
        const hasRecoveryType = hash.get("type") === "recovery";

        if (!active) return;

        if (data.session && hasRecoveryType) {
          setHasRecoverySession(true);
          setCheckingSession(false);
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      if (active) {
        setCheckingSession(false);
      }
    };

    void detectRecoverySession();
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || Boolean(session)) {
        setHasRecoverySession(true);
        setCheckingSession(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  async function handleUpdatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      await supabase.auth.signOut();
      router.replace("/auth?reset=success");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Failed to update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="px-shell flex min-h-[80vh] w-full max-w-md items-center py-10">
      <section className="px-panel w-full p-6">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900 dark:text-white">Reset password</h1>
        <p className="mb-6 text-sm text-slate-700 dark:text-slate-300">
          Set a new password for your PostureX account.
        </p>

        {checkingSession ? (
          <p className="text-sm text-slate-700 dark:text-slate-300">Validating reset link...</p>
        ) : null}

        {!checkingSession && !hasRecoverySession ? (
          <div className="space-y-3">
            <p className="text-sm text-red-700 dark:text-red-300">
              This reset link is invalid or expired. Request a new password reset email.
            </p>
            <button
              type="button"
              onClick={() => router.replace("/auth")}
              className="w-full rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              Back to sign in
            </button>
          </div>
        ) : null}

        {!checkingSession && hasRecoverySession ? (
          <form className="space-y-3" onSubmit={handleUpdatePassword}>
            <input
              type="password"
              className="w-full rounded-xl border border-white/20 bg-white/60 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-400 focus:ring dark:bg-slate-800/60 dark:text-slate-100"
              placeholder="New password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
            <input
              type="password"
              className="w-full rounded-xl border border-white/20 bg-white/60 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-400 focus:ring dark:bg-slate-800/60 dark:text-slate-100"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={6}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        ) : null}

        {message ? <p className="mt-4 text-sm text-sky-700 dark:text-sky-200">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-700 dark:text-red-200">{error}</p> : null}
      </section>
    </main>
  );
}
