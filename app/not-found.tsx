import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section-shell flex min-h-[70vh] items-center justify-center py-16">
      <div className="glass-card max-w-xl space-y-4 p-8 text-center">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">404</p>
        <h1 className="text-3xl font-semibold text-white">Page not found</h1>
        <p className="text-sm text-slate-300">
          The requested route could not be resolved. Use the dashboard or return to the landing page.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn-primary">
            Home
          </Link>
          <Link href="/dashboard" className="btn-secondary">
            Dashboard
          </Link>
        </div>
      </div>
    </section>
  );
}
