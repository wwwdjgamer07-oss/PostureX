import { redirect } from "next/navigation";
import { Bell, Trophy, TriangleAlert } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

interface SessionRow {
  id: string;
  peak_risk: string | null;
  alert_count: number | null;
  started_at: string;
}

interface BreakRow {
  id: string;
  duration_seconds: number;
  taken: boolean;
  created_at: string;
}

export default async function AlertsPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?next=/alerts");
  }

  const [notificationResult, sessionResult, breakResult, achievementResult] = await Promise.all([
    supabase
      .from("notifications")
      .select("id,title,message,type,read,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("sessions")
      .select("id,peak_risk,alert_count,started_at")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(10),
    supabase.from("breaks").select("id,duration_seconds,taken,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("achievements").select("id,title,icon").eq("user_id", user.id).order("id", { ascending: false }).limit(6)
  ]);

  const notifications = (notificationResult.data as NotificationRow[] | null) ?? [];
  const sessionAlerts = ((sessionResult.data as SessionRow[] | null) ?? []).filter((item) => (item.alert_count ?? 0) > 0);
  const breakEvents = (breakResult.data as BreakRow[] | null) ?? [];
  const achievements = (achievementResult.data as Array<{ id: string; title: string; icon: string }> | null) ?? [];

  return (
    <main className="px-shell space-y-6">
      <header className="px-panel p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">PostureX Signal Feed</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Alerts & Notifications</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Risk warnings, break reminders, and performance achievements in one timeline.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="px-panel p-5 lg:col-span-2">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Bell className="h-5 w-5 text-cyan-300" />
            Notifications
          </h2>
          <div className="mt-4 space-y-2">
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">No notifications yet.</p>
            ) : (
              notifications.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-300/45 bg-white/70 p-4 dark:border-slate-500/25 dark:bg-slate-900/55">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{item.message}</p>
                    </div>
                    {!item.read ? <span className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-2 py-1 text-[10px] uppercase tracking-wide text-cyan-700 dark:text-cyan-200">new</span> : null}
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-wide text-slate-600 dark:text-slate-500">
                    {item.type} | {new Date(item.created_at).toLocaleString()}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="space-y-4">
          <article className="px-panel p-5">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <TriangleAlert className="h-5 w-5 text-cyan-300" />
              Risk Warnings
            </h2>
            <div className="mt-4 space-y-2">
              {sessionAlerts.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">No recent warnings.</p>
              ) : (
                sessionAlerts.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-300/45 bg-white/70 p-3 text-sm text-slate-700 dark:border-slate-500/25 dark:bg-slate-900/55 dark:text-slate-300">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{item.peak_risk ?? "UNKNOWN"} risk session</p>
                    <p className="text-xs text-slate-600 dark:text-slate-500">{item.alert_count ?? 0} alerts | {new Date(item.started_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="px-panel p-5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Break Reminders</h2>
            <div className="mt-4 space-y-2">
              {breakEvents.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">No break reminders recorded.</p>
              ) : (
                breakEvents.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-300/45 bg-white/70 p-3 text-sm text-slate-700 dark:border-slate-500/25 dark:bg-slate-900/55 dark:text-slate-300">
                    <p>{item.taken ? "Break completed" : "Break snoozed"}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-500">{item.duration_seconds}s | {new Date(item.created_at).toLocaleTimeString()}</p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="px-panel p-5">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <Trophy className="h-5 w-5 text-cyan-300" />
              Achievements
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {achievements.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">No achievements unlocked yet.</p>
              ) : (
                achievements.map((item) => (
                  <span key={item.id} className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-700 dark:text-cyan-100">
                    {item.icon} {item.title}
                  </span>
                ))
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
