import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/DashboardClient";
import { getUserPlanTierForClient } from "@/lib/planAccess";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { calculateCurrentStreak } from "@/lib/streak";
import { syncSubscriptionExpiry } from "@/lib/subscriptionLifecycle";

interface SessionRow {
  id: string;
  avg_alignment: number;
  avg_stability: number | null;
  avg_symmetry: number | null;
  peak_risk: string | null;
  duration_seconds: number;
  started_at: string;
  alert_count: number | null;
  source?: "camera" | "sensor" | null;
}

interface DashboardSessionRow {
  id: string;
  avg_alignment: number;
  stability: number;
  symmetry: number;
  risk_level: string;
  duration_seconds: number;
  started_at: string;
  alert_count: number;
  source: "camera" | "sensor";
}

interface DailyPostureRow {
  date: string;
  avg_score: number;
  sessions_count: number;
}

interface DailyMetricsRow {
  avg_score: number | null;
  total_sessions: number | null;
  total_duration: number | null;
}

function isMissingSourceColumn(message: string | null | undefined) {
  const normalized = String(message ?? "").toLowerCase();
  return normalized.includes("source") && (normalized.includes("does not exist") || normalized.includes("schema cache"));
}

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  await syncSubscriptionExpiry(supabase, user.id);

  const { data: profileRow } = await supabase.from("users").select("px_dashboard_layout").eq("id", user.id).maybeSingle();
  const planTier = await getUserPlanTierForClient(supabase, user.id, user.email);
  const initialDashboardLayout =
    ((profileRow as { px_dashboard_layout?: Record<string, unknown> } | null)?.px_dashboard_layout as Record<string, unknown> | undefined) ?? {};

  const primarySessionQuery = await supabase
    .from("sessions")
    .select("id, avg_alignment, avg_stability, avg_symmetry, peak_risk, duration_seconds, started_at, alert_count, source")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(20);
  const sessionQuery = primarySessionQuery.error && isMissingSourceColumn(primarySessionQuery.error.message)
    ? await supabase
      .from("sessions")
      .select("id, avg_alignment, avg_stability, avg_symmetry, peak_risk, duration_seconds, started_at, alert_count")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(20)
    : primarySessionQuery;
  const initialRows: SessionRow[] = Array.isArray(sessionQuery.data) ? (sessionQuery.data as SessionRow[]) : [];
  const initialSessions: DashboardSessionRow[] = initialRows.map((row) => ({
    id: row.id,
    avg_alignment: Number(row.avg_alignment ?? 0),
    stability: Number(row.avg_stability ?? 0),
    symmetry: Number(row.avg_symmetry ?? 0),
    risk_level: String(row.peak_risk ?? "LOW"),
    duration_seconds: Number(row.duration_seconds ?? 0),
    started_at: row.started_at,
    alert_count: Number(row.alert_count ?? 0),
    source: row.source === "sensor" ? "sensor" : "camera"
  }));

  const { data: dailyRowsData } = await supabase
    .from("daily_posture")
    .select("date, avg_score, sessions_count")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(7);
  const dailyRows: DailyPostureRow[] = Array.isArray(dailyRowsData) ? (dailyRowsData as DailyPostureRow[]) : [];
  const today = new Date().toISOString().slice(0, 10);
  const todayRow = dailyRows.find((row) => row.date === today);
  const { data: dailyMetricsRow } = await supabase
    .from("daily_metrics")
    .select("avg_score,total_sessions,total_duration")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();
  const parsedDailyMetrics = (dailyMetricsRow as DailyMetricsRow | null) ?? null;
  const { data: streakRow } = await supabase.from("user_streaks").select("current_streak").eq("user_id", user.id).maybeSingle();
  const fallbackStreak = calculateCurrentStreak(dailyRows.map((row) => ({ date: row.date, sessions_count: row.sessions_count })));
  const streak = Number(streakRow?.current_streak ?? fallbackStreak);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [{ data: breaksTodayRows }, { data: lastBreakRow }] = await Promise.all([
    supabase
      .from("breaks")
      .select("id")
      .eq("user_id", user.id)
      .gte("created_at", startOfToday.toISOString()),
    supabase
      .from("breaks")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("taken", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  return (
    <DashboardClient
      userId={user.id}
      planTier={planTier}
      initialSessions={initialSessions}
      initialDailyProgress={{
        todayScore: Math.round(Number(todayRow?.avg_score ?? 0)),
        sessionsToday: Number(todayRow?.sessions_count ?? 0),
        totalDurationToday: Number(parsedDailyMetrics?.total_duration ?? 0),
        streak,
        weeklyTrend: [...dailyRows].reverse().map((row) => ({
          date: row.date,
          avg_score: Number(row.avg_score ?? 0),
          sessions_count: Number(row.sessions_count ?? 0)
        }))
      }}
      initialBreakStats={{
        breaksToday: Array.isArray(breaksTodayRows) ? breaksTodayRows.length : 0,
        lastBreakAt: lastBreakRow?.created_at ?? null
      }}
      initialDashboardLayout={initialDashboardLayout}
    />
  );
}
