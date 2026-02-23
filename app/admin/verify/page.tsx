"use client";

import { Suspense } from "react";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";

function AdminVerifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = searchParams?.get("next") || "/admin";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Verification failed.");
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="px-shell py-10">
      <article className="px-panel mx-auto max-w-md p-6">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-200">
          <ShieldCheck className="h-4 w-4" />
          Admin Verification
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Enter Admin OTP</h1>
        <p className="mt-2 text-sm text-slate-300">Second-factor confirmation is required to open admin routes.</p>
        <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-3">
          <input
            type="password"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Admin OTP"
            className="w-full rounded-xl border border-slate-500/35 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 outline-none"
          />
          <button type="submit" disabled={loading} className="px-button w-full disabled:opacity-60">
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      </article>
    </section>
  );
}

export default function AdminVerifyPage() {
  return (
    <Suspense
      fallback={
        <section className="px-shell py-10">
          <article className="px-panel mx-auto max-w-md p-6">
            <p className="text-sm text-slate-300">Loading verification...</p>
          </article>
        </section>
      }
    >
      <AdminVerifyPageContent />
    </Suspense>
  );
}
