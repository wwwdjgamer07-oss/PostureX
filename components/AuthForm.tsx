"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, LockKeyhole, Chrome, UserPlus, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "signin" | "signup";

interface Props {
  nextPath?: string;
}

export function AuthForm({ nextPath = "/dashboard" }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) throw signInError;
        router.push(nextPath);
        router.refresh();
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName
          }
        }
      });
      if (signUpError) throw signUpError;
      setInfo("Account created. Check your email to verify and continue.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Authentication failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo }
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setLoading(false);
    }
  };

  return (
    <div className="glass-card mx-auto w-full max-w-md p-6 sm:p-8">
      <div className="mb-6 space-y-2">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Secure access</p>
        <h1 className="text-2xl font-semibold text-white">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-slate-300">
          {mode === "signin"
            ? "Sign in to continue monitoring posture intelligence."
            : "Start your free trial and unlock AI-powered posture analytics."}
        </p>
      </div>

      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={loading}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-blue-400/10 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-blue-400/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Chrome className="h-4 w-4" />
        Continue with Google
      </button>

      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-blue-200/20" />
        <span className="text-xs text-slate-500">or</span>
        <div className="h-px flex-1 bg-blue-200/20" />
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" ? (
          <label className="block space-y-1">
            <span className="text-xs text-slate-400">Full name</span>
            <input
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-xl border border-blue-300/25 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none ring-blue-300/40 transition focus:ring"
              placeholder="Alex Morgan"
            />
          </label>
        ) : null}

        <label className="block space-y-1">
          <span className="text-xs text-slate-400">Email</span>
          <div className="flex items-center rounded-xl border border-blue-300/25 bg-slate-950/70 px-3">
            <Mail className="h-4 w-4 text-slate-500" />
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full bg-transparent px-2 py-2 text-sm text-white outline-none"
              placeholder="name@company.com"
            />
          </div>
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-slate-400">Password</span>
          <div className="flex items-center rounded-xl border border-blue-300/25 bg-slate-950/70 px-3">
            <LockKeyhole className="h-4 w-4 text-slate-500" />
            <input
              required
              minLength={8}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-transparent px-2 py-2 text-sm text-white outline-none"
              placeholder="Minimum 8 characters"
            />
          </div>
        </label>

        {error ? <p className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p> : null}
        {info ? <p className="rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">{info}</p> : null}

        <button type="submit" disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2 py-2.5">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode((value) => (value === "signin" ? "signup" : "signin"))}
        disabled={loading}
        className="mt-4 w-full text-center text-xs text-slate-400 transition hover:text-blue-200"
      >
        {mode === "signin" ? "Need an account? Create one" : "Already registered? Sign in"}
      </button>
    </div>
  );
}
