"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getAppUrl } from "@/lib/env";

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
    const fromEnv = getAppUrl();
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
    const run = async () => {
      const query = new URLSearchParams(window.location.search);

      if (query.get("reset") === "success") {
        setMode("signin");
        setMessage("Password updated. Please sign in with your new password.");
      }

      const code = query.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error("OAuth exchange failed", exchangeError);
          const msg = String(exchangeError.message || "").toLowerCase();
          if (msg.includes("pkce") || msg.includes("verifier")) {
            setError("Google sign-in failed in embedded browser. Open PostureX in your default browser and try again.");
          } else {
            setError("Google sign-in could not be completed. Please try again.");
          }
          return;
        }
        await fetch("/api/subscription/sync", { method: "POST", credentials: "include" }).catch(() => null);
        router.replace("/dashboard");
        return;
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
    };

    void run();
  }, [router, supabase.auth]);

  useEffect(() => {
    const initialize = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await fetch("/api/subscription/sync", { method: "POST", credentials: "include" }).catch(() => null);
        router.replace("/dashboard");
      }
    };

    void initialize();
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetch("/api/subscription/sync", { method: "POST", credentials: "include" }).catch(() => null);
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
        await fetch("/api/subscription/sync", { method: "POST", credentials: "include" }).catch(() => null);
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
      const redirectTo = `${getSiteUrl()}/auth/callback`;
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo }
      });

      if (oauthError) throw oauthError;
      const oauthUrl = data?.url;
      if (!oauthUrl) {
        throw new Error("Google OAuth URL was not returned.");
      }

      window.location.assign(oauthUrl);
    } catch (oauthFailure) {
      console.error("Google OAuth failed", oauthFailure);
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

  function openInBrowser() {
    if (typeof window === "undefined") return;
    window.open(window.location.href, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="flex min-h-[calc(100dvh-5rem)] w-full items-center py-6 sm:py-12">
      <div className="mx-auto w-[94vw] max-w-none pb-[env(safe-area-inset-bottom)] sm:max-w-md">
        <div className="w-full rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-[0_0_40px_rgba(0,200,255,0.15)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5 sm:p-8">
          <header className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/60 bg-cyan-400/15 text-sm font-semibold text-cyan-700 dark:border-cyan-300/40 dark:bg-cyan-400/10 dark:text-cyan-100">
              PX
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100 sm:text-2xl">PostureX Auth</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">Sign in or create your account.</p>
            </div>
          </header>

          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200/70 bg-slate-100/70 p-1 dark:border-white/10 dark:bg-white/5">
              <button
                type="button"
                className={`h-11 rounded-lg text-sm font-semibold transition ${mode === "signin" ? "bg-gradient-to-r from-blue-500 to-cyan-400 text-white" : "text-slate-600 dark:text-slate-300"}`}
                onClick={() => setMode("signin")}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`h-11 rounded-lg text-sm font-semibold transition ${mode === "signup" ? "bg-gradient-to-r from-blue-500 to-cyan-400 text-white" : "text-slate-600 dark:text-slate-300"}`}
                onClick={() => setMode("signup")}
              >
                Sign Up
              </button>
            </div>

            <form className="grid gap-3" onSubmit={handleEmailAuth}>
              {mode === "signup" ? (
                <input
                  className="h-12 w-full rounded-xl border border-slate-200/80 bg-white/90 px-4 text-base text-slate-900 outline-none focus:ring-2 focus:ring-cyan-400/40 placeholder:text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-400"
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              ) : null}

              <input
                type="email"
                className="h-12 w-full rounded-xl border border-slate-200/80 bg-white/90 px-4 text-base text-slate-900 outline-none focus:ring-2 focus:ring-cyan-400/40 placeholder:text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-400"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <input
                type="password"
                className="h-12 w-full rounded-xl border border-slate-200/80 bg-white/90 px-4 text-base text-slate-900 outline-none focus:ring-2 focus:ring-cyan-400/40 placeholder:text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-400"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />

              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-base font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
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
                  className="h-11 w-full rounded-xl border border-slate-200/80 bg-white/85 text-base font-semibold text-slate-800 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                >
                  Forgot password
                </button>
              ) : null}
            </form>

            <div className="h-px bg-slate-200 dark:bg-white/10" />

            <button
              type="button"
              disabled={loading}
              onClick={() => {
                void handleGoogleOAuth();
              }}
              className="h-11 w-full rounded-xl border border-slate-200/80 bg-white/85 text-base font-semibold text-slate-800 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
            >
              Continue with Google
            </button>
            <button
              type="button"
              onClick={openInBrowser}
              className="h-11 w-full rounded-xl border border-slate-200/80 bg-white/85 text-base font-semibold text-slate-800 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
            >
              Open in Browser
            </button>

            {error?.toLowerCase().includes("verification link expired") ? (
              <button
                type="button"
                disabled={resending || loading}
                onClick={() => {
                  void handleResendConfirmation();
                }}
                className="h-11 w-full rounded-xl border border-slate-200/80 bg-white/85 text-base font-semibold text-slate-800 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
              >
                {resending ? "Sending..." : "Resend verification email"}
              </button>
            ) : null}

            {message ? <p className="text-sm text-cyan-700 dark:text-cyan-200">{message}</p> : null}
            {error ? <p className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}
          </div>
        </div>
      </div>
    </main>
  );
}
