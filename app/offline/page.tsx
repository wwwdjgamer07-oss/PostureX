import Link from "next/link";

export default function OfflinePage() {
  return (
    <section className="section-shell flex min-h-[70vh] items-center justify-center py-16">
      <div className="glass-card max-w-lg space-y-4 p-8 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-blue-200/80">Offline mode</p>
        <h1 className="text-3xl font-semibold text-white">You are currently offline.</h1>
        <p className="text-sm text-slate-300">
          Cached pages remain available. Reconnect to sync posture sessions, analytics, and billing updates.
        </p>
        <Link href="/" className="btn-primary inline-block">
          Return Home
        </Link>
      </div>
    </section>
  );
}
