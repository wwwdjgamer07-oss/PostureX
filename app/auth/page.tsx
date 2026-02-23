"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  function getSiteUrl() {
    const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (fromEnv) return fromEnv.replace(/\/$/, "");
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }

  function mapAuthErrorMessage(raw: string) {
    const lowered = raw.toLowerCase();
    if (lowered.includes("otp_expired") || lowered.includes("access_denied")) {
      return "Verification link expired. Request new link.";
    }
    if (raw.toLowerCase().includes("invalid login credentials")) {
      return "Invalid email or password. If this account already exists, use Forgot password to reset it.";
    }
    return raw;
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const run = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const hashError = hash.get("error");
      const hashErrorCode = hash.get("error_code");
      const hashType = hash.get("type");
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (hashErrorCode === "otp_expired" || hashError === "access_denied") {
        setError("Verification link expired. Request new link.");
        return;
      }

      if (hashType === "recovery" && accessToken && refreshToken) {
        router.replace(`/reset-password${window.location.hash}`);
        return;
      }

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        if (sessionError) {
          setError(mapAuthErrorMessage(sessionError.message));
          return;
        }
        router.replace("/dashboard");
      }
    };

    void run();
  }, [router, supabase.auth]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = new URLSearchParams(window.location.search);

    if (query.get("reset") === "success") {
      setMode("signin");
      setMessage("Password updated. Please sign in with your new password.");
    }

    const queryError = query.get("error");
    if (queryError === "verification_link_expired") {
      setError("Verification link expired. Request new link.");
    }
    if (queryError === "pkce_verifier_missing") {
      setError("Login link is invalid for this browser session. Start sign-in again from this same browser.");
    }
    if (queryError === "auth_callback_failed") {
      setError("Could not complete sign-in. Please try again.");
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        router.replace("/dashboard");
      }
    };

    void initialize();
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        router.replace("/dashboard");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase.auth]);

  async function handleEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) throw signInError;
        router.replace("/dashboard");
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${getSiteUrl()}/auth`,
            data: { full_name: fullName }
          }
        });

        if (signUpError) throw signUpError;
        const identities = signUpData.user?.identities ?? [];
        if (signUpData.user && identities.length === 0) {
          setMode("signin");
          setMessage("Account already exists for this email. Sign in or use Forgot password.");
          return;
        }
        if (signUpData.session) {
          await supabase.auth.signOut();
        }
        setMessage("Check your email to confirm your account.");
      }
    } catch (authError) {
      setError(
        authError instanceof Error
          ? mapAuthErrorMessage(authError.message)
          : "Authentication failed."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError("Enter your email first, then click Forgot password.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const redirectTo = `${getSiteUrl()}/reset-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo
      });
      if (resetError) throw resetError;
      setMessage("Password reset email sent. Check inbox and spam.");
    } catch (resetFailure) {
      setError(
        resetFailure instanceof Error
          ? mapAuthErrorMessage(resetFailure.message)
          : "Failed to send password reset email."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleOAuth() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const redirectTo = `${getSiteUrl()}/auth/callback?next=/dashboard`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo }
      });

      if (oauthError) throw oauthError;
    } catch (oauthFailure) {
      setError(oauthFailure instanceof Error ? oauthFailure.message : "Google OAuth failed.");
      setLoading(false);
    }
  }

  async function handleResendConfirmation() {
    if (!email.trim()) {
      setError("Enter your email first, then click Resend verification.");
      return;
    }

    setResending(true);
    setError(null);
    setMessage(null);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${getSiteUrl()}/auth`
        }
      });
      if (resendError) throw resendError;
      setMessage("Verification email sent. Open the latest email link on this same device.");
    } catch (resendFailure) {
      setError(
        resendFailure instanceof Error
          ? mapAuthErrorMessage(resendFailure.message)
          : "Failed to resend verification email."
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="px-shell flex min-h-[80vh] w-full max-w-md items-center py-10">
      <div className="px-panel w-full p-6">
        <h1 className="mb-1 text-2xl font-semibold text-white">PostureX Auth</h1>
        <p className="mb-6 text-sm text-slate-300">
          Sign in or create your account.
        </p>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-lg border border-white/20 bg-white/40 p-1 dark:bg-slate-800/50">
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm ${mode === "signin" ? "bg-sky-600 text-white" : "text-slate-700 dark:text-slate-200"}`}
            onClick={() => setMode("signin")}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-2 text-sm ${mode === "signup" ? "bg-sky-600 text-white" : "text-slate-700 dark:text-slate-200"}`}
            onClick={() => setMode("signup")}
          >
            Sign Up
          </button>
        </div>

        <form className="space-y-3" onSubmit={handleEmailAuth}>
          {mode === "signup" ? (
            <input
              className="w-full rounded-xl border border-white/20 bg-white/60 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-400 focus:ring dark:bg-slate-800/60 dark:text-slate-100"
              placeholder="Full Name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          ) : null}

          <input
            type="email"
            className="w-full rounded-xl border border-white/20 bg-white/60 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-400 focus:ring dark:bg-slate-800/60 dark:text-slate-100"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            type="password"
            className="w-full rounded-xl border border-white/20 bg-white/60 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-400 focus:ring dark:bg-slate-800/60 dark:text-slate-100"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Processing..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>

          {mode === "signin" ? (
            <button
              type="button"
              onClick={() => {
                void handleForgotPassword();
              }}
              disabled={loading}
              className="w-full rounded-xl border border-white/20 bg-white/60 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800/60 dark:text-slate-100"
            >
              Forgot password
            </button>
          ) : null}
        </form>

        <div className="my-4 h-px bg-white/20" />

        <button
          type="button"
          disabled={loading}
          onClick={() => {
            void handleGoogleOAuth();
          }}
          className="w-full rounded-xl border border-white/20 bg-white/60 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800/60 dark:text-slate-100"
        >
          Continue with Google
        </button>

        {error?.toLowerCase().includes("verification link expired") ? (
          <button
            type="button"
            disabled={resending || loading}
            onClick={() => {
              void handleResendConfirmation();
            }}
            className="mt-3 w-full rounded-xl border border-white/20 bg-white/60 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800/60 dark:text-slate-100"
          >
            {resending ? "Sending..." : "Resend verification email"}
          </button>
        ) : null}

        {message ? <p className="mt-4 text-sm text-sky-200">{message}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-200">{error}</p> : null}
      </div>
    </main>
  );
}
