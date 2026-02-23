"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <main className="px-shell flex min-h-[70vh] items-center justify-center py-10">
      <section className="px-panel w-full max-w-xl p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-rose-200/80">Unexpected error</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Something went wrong.</h1>
        <p className="mt-2 text-sm text-slate-300">
          Please retry. If this keeps happening, refresh the page and try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
