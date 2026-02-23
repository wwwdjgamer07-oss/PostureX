export default function PrivacyPage() {
  return (
    <section className="section-shell py-10">
      <article className="glass-card mx-auto max-w-4xl space-y-4 p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">Privacy Policy</p>
        <h1 className="text-3xl font-semibold text-white">PostureX Privacy and Data Handling</h1>
        <p className="text-sm text-slate-300">
          PostureX processes posture landmarks and derived posture metrics to provide realtime coaching and trend
          analytics. Camera frames are processed in-browser and raw video is not stored by default.
        </p>
        <h2 className="text-xl font-semibold text-white">Data We Store</h2>
        <p className="text-sm text-slate-300">
          We store session summaries, posture scores, risk events, subscription records, and optional analytics events
          in Supabase with row-level security controls.
        </p>
        <h2 className="text-xl font-semibold text-white">Security Controls</h2>
        <p className="text-sm text-slate-300">
          The platform uses secure session cookies, CSRF protection for mutable API requests, middleware route guards,
          and rate limiting on API traffic.
        </p>
        <h2 className="text-xl font-semibold text-white">Your Rights</h2>
        <p className="text-sm text-slate-300">
          You may export your session history as CSV/PDF and permanently delete your account from the settings page.
        </p>
        <p className="text-xs text-slate-500">Last updated: February 15, 2026</p>
      </article>
    </section>
  );
}
