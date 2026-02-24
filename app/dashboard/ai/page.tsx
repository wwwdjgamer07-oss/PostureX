import { redirect } from "next/navigation";
import { Activity, Brain, ShieldAlert, Timer, TrendingUp } from "lucide-react";
import { AIChatPanel } from "@/components/dashboard/AIChatPanel";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireProAccess } from "@/lib/subscriptionLifecycle";

interface SessionRow {
  avg_alignment: number;
  avg_stability: number | null;
  avg_symmetry: number | null;
  peak_risk: string | null;
  duration_seconds: number;
}

interface WeeklyRow {
  date: string;
  avg_score: number;
  sessions_count: number;
}

function riskToFatigue(riskLevel: string) {
  switch (riskLevel) {
    case "LOW":
      return 22;
    case "MODERATE":
      return 48;
    case "HIGH":
      return 68;
    case "SEVERE":
      return 82;
    default:
      return 35;
  }
}

function averageWeeklyScore(points: WeeklyRow[]) {
  if (points.length === 0) return 0;
  const total = points.reduce((sum, point) => sum + Number(point.avg_score ?? 0), 0);
  return Math.round(total / points.length);
}

export default async function DashboardAIPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  await requireProAccess(supabase, user.id, "/pricing?plan=basic");

  const [{ data: latestSessionRow }, { data: weeklyRowsData }] = await Promise.all([
    supabase
      .from("sessions")
      .select("avg_alignment, avg_stability, avg_symmetry, peak_risk, duration_seconds")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("daily_posture")
      .select("date, avg_score, sessions_count")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(7)
  ]);

  const latestSession = (latestSessionRow as SessionRow | null) ?? null;
  const weeklyTrend = (Array.isArray(weeklyRowsData) ? (weeklyRowsData as WeeklyRow[]) : []).reverse();
  const alignmentScore = latestSession ? Math.round(Number(latestSession.avg_alignment ?? 0)) : averageWeeklyScore(weeklyTrend);
  const riskLevel = String(latestSession?.peak_risk ?? "LOW").toUpperCase();
  const fatigueLevel = riskToFatigue(riskLevel);
  const sessionDuration = Number(latestSession?.duration_seconds ?? 0);
  const weeklyAverage = averageWeeklyScore(weeklyTrend);
  const trendDelta =
    weeklyTrend.length >= 2
      ? Math.round(Number(weeklyTrend[weeklyTrend.length - 1]?.avg_score ?? 0) - Number(weeklyTrend[0]?.avg_score ?? 0))
      : 0;

  return (
    <div className="px-shell grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section>
        <AIChatPanel
          userId={user.id}
          metrics={{
            alignment_score: alignmentScore,
            fatigue_level: fatigueLevel,
            session_duration: sessionDuration,
            risk_level: riskLevel,
            weekly_trend: weeklyTrend
          }}
          isOpen
          mode="page"
          showClose={false}
        />
      </section>

      <aside className="space-y-4">
        <article className="px-panel p-5">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-300">
            <Brain className="h-4 w-4" />
            Posture Insights
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">AI Coach Console</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Live guidance tuned to your dashboard posture metrics.
          </p>
        </article>

        <article className="px-kpi p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Alignment</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{alignmentScore}%</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">Current posture quality</p>
        </article>

        <article className="px-kpi p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Fatigue</p>
          <p className="mt-2 inline-flex items-center gap-2 text-3xl font-semibold text-slate-900 dark:text-white">
            <Activity className="h-5 w-5 text-cyan-300" />
            {fatigueLevel}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">Load estimate from session risk</p>
        </article>

        <article className="px-kpi p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Session Duration</p>
          <p className="mt-2 inline-flex items-center gap-2 text-3xl font-semibold text-slate-900 dark:text-white">
            <Timer className="h-5 w-5 text-cyan-300" />
            {Math.floor(sessionDuration / 60)}m
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">Most recent tracked session</p>
        </article>

        <article className="px-kpi p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Weekly Trend</p>
          <p className="mt-2 inline-flex items-center gap-2 text-3xl font-semibold text-slate-900 dark:text-white">
            <TrendingUp className="h-5 w-5 text-cyan-300" />
            {weeklyAverage}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">
            {trendDelta >= 0 ? `Up ${trendDelta}` : `Down ${Math.abs(trendDelta)}`} from first to latest day
          </p>
        </article>

        <article className="px-panel p-4">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <ShieldAlert className="h-4 w-4 text-cyan-300" />
            Active risk band
          </p>
          <p className="mt-2 text-lg font-semibold text-cyan-100">{riskLevel}</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-500">
            Use the chat to get specific correction steps for this risk state.
          </p>
        </article>
      </aside>
    </div>
  );
}
