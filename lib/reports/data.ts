import type { SupabaseClient } from "@supabase/supabase-js";
import type { PostureReportMetrics, ReportPeriod, ReportRange } from "@/lib/reports/types";
import { resolvePreviousRange } from "@/lib/reports/range";

type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "SEVERE" | "CRITICAL";

interface UserProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
}

interface SessionLikeRow {
  started_at: string | null;
  duration_seconds: number | null;
  avg_alignment: number | null;
  avg_symmetry: number | null;
  avg_fatigue: number | null;
  peak_risk: string | null;
}

interface DailyScoreLikeRow {
  date: string;
  avg_score: number | null;
  sessions_count: number | null;
}

interface RiskEventLikeRow {
  id: string;
}

function toNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, value));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toRiskWeight(level: string): number {
  const normalized = String(level || "LOW").toUpperCase();
  if (normalized === "CRITICAL") return 5;
  if (normalized === "SEVERE") return 4;
  if (normalized === "HIGH") return 3;
  if (normalized === "MODERATE") return 2;
  return 1;
}

function maxRisk(levels: string[]): RiskLevel {
  const sorted = [...levels].sort((a, b) => toRiskWeight(b) - toRiskWeight(a));
  const winner = String(sorted[0] || "LOW").toUpperCase();
  if (winner === "CRITICAL" || winner === "SEVERE" || winner === "HIGH" || winner === "MODERATE" || winner === "LOW") {
    return winner;
  }
  return "LOW";
}

function buildInsights(input: {
  avgScore: number;
  fatigueIndex: number;
  riskLevel: RiskLevel;
  improvement: number;
  slouchEvents: number;
}) {
  const trendText =
    input.improvement > 0
      ? `Posture trend improved by ${input.improvement.toFixed(1)} points from the previous period.`
      : input.improvement < 0
        ? `Posture trend declined by ${Math.abs(input.improvement).toFixed(1)} points from the previous period.`
        : "Posture trend is stable compared to the previous period.";

  const riskText =
    input.riskLevel === "LOW"
      ? "Risk exposure remained low across sessions."
      : input.riskLevel === "MODERATE"
        ? "Moderate posture risk appears intermittently."
        : "High-risk posture behavior needs proactive correction blocks.";

  const fatigueText =
    input.fatigueIndex >= 70
      ? "Fatigue index is elevated; schedule shorter sessions with more breaks."
      : input.fatigueIndex >= 45
        ? "Fatigue index is moderate; maintain break discipline."
        : "Fatigue remains controlled.";

  const aiInsightsSummary = `${trendText} ${riskText} ${fatigueText}`;
  const recommendedCorrections = [
    input.slouchEvents > 8 ? "Add a 60-second posture reset every 25 minutes." : "Keep a 45-second reset every 30 minutes.",
    input.avgScore < 70 ? "Raise screen height to reduce forward-head compensation." : "Maintain current workstation setup and monitor alignment.",
    input.fatigueIndex >= 60 ? "Use micro-break breathing (4 deep breaths) after each focused block." : "Continue low-load mobility drills for neck and shoulders."
  ];

  return { aiInsightsSummary, recommendedCorrections };
}

async function selectProfile(supabase: SupabaseClient, userId: string) {
  const preferred = await supabase
    .from("user_profile")
    .select("id,email,full_name")
    .eq("id", userId)
    .maybeSingle();

  if (!preferred.error && preferred.data) {
    return preferred.data as UserProfileRow;
  }

  const fallback = await supabase
    .from("users")
    .select("id,email,full_name")
    .eq("id", userId)
    .maybeSingle();

  if (fallback.error || !fallback.data) {
    throw new Error(fallback.error?.message || "Failed to load user profile.");
  }

  return fallback.data as UserProfileRow;
}

async function selectDailyScores(supabase: SupabaseClient, userId: string, range: ReportRange) {
  const preferred = await supabase
    .from("daily_scores")
    .select("date,avg_score,sessions_count")
    .eq("user_id", userId)
    .gte("date", range.start)
    .lte("date", range.end)
    .order("date", { ascending: true });

  if (!preferred.error) {
    return (preferred.data ?? []) as DailyScoreLikeRow[];
  }

  const fallback = await supabase
    .from("daily_posture")
    .select("date,avg_score,sessions_count")
    .eq("user_id", userId)
    .gte("date", range.start)
    .lte("date", range.end)
    .order("date", { ascending: true });

  if (fallback.error) {
    throw new Error(fallback.error.message || "Failed to load daily scores.");
  }

  return (fallback.data ?? []) as DailyScoreLikeRow[];
}

async function selectSessions(supabase: SupabaseClient, userId: string, range: ReportRange) {
  const startIso = `${range.start}T00:00:00.000Z`;
  const endIso = `${range.end}T23:59:59.999Z`;

  const preferred = await supabase
    .from("posture_sessions")
    .select("started_at,duration_seconds,avg_alignment,avg_symmetry,avg_fatigue,peak_risk")
    .eq("user_id", userId)
    .gte("started_at", startIso)
    .lte("started_at", endIso);

  if (!preferred.error) {
    return (preferred.data ?? []) as SessionLikeRow[];
  }

  const fallback = await supabase
    .from("sessions")
    .select("started_at,duration_seconds,avg_alignment,avg_symmetry,avg_fatigue,peak_risk")
    .eq("user_id", userId)
    .gte("started_at", startIso)
    .lte("started_at", endIso);

  if (!fallback.error) {
    return (fallback.data ?? []) as SessionLikeRow[];
  }

  // If the first fallback failed, we attempt the compatibility query.
  // Compatibility fallback for schemas that do not include avg_fatigue.
  const fallbackWithoutFatigue = await supabase
    .from("sessions")
    .select("started_at,duration_seconds,avg_alignment,avg_symmetry,peak_risk,risk_level")
    .eq("user_id", userId)
    .gte("started_at", startIso)
    .lte("started_at", endIso);

  if (fallbackWithoutFatigue.error) {
    throw new Error(fallbackWithoutFatigue.error.message || "Failed to load sessions.");
  }

  return ((fallbackWithoutFatigue.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    started_at: (row.started_at as string | null) ?? null,
    duration_seconds: toNumber(row.duration_seconds, 0),
    avg_alignment: toNumber(row.avg_alignment, 0),
    avg_symmetry: toNumber(row.avg_symmetry, 0),
    avg_fatigue: 0,
    peak_risk: String(row.peak_risk ?? row.risk_level ?? "LOW")
  }));
}

async function selectSlouchEvents(supabase: SupabaseClient, userId: string, range: ReportRange) {
  const startIso = `${range.start}T00:00:00.000Z`;
  const endIso = `${range.end}T23:59:59.999Z`;

  const preferred = await supabase
    .from("posture_events")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", startIso)
    .lte("created_at", endIso)
    .in("event_type", ["slouch", "high_risk", "neck_tilt"]);

  if (!preferred.error) {
    return (preferred.data ?? []) as RiskEventLikeRow[];
  }

  const fallback = await supabase
    .from("risk_events")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", startIso)
    .lte("created_at", endIso)
    .in("level", ["MODERATE", "HIGH", "SEVERE", "CRITICAL"]);

  if (fallback.error) {
    const normalizedError = String(fallback.error.message || "").toLowerCase();
    const missingTable = normalizedError.includes("public.risk_events") && normalizedError.includes("schema cache");
    if (missingTable) {
      return [];
    }
    throw new Error(fallback.error.message || "Failed to load posture events.");
  }

  return (fallback.data ?? []) as RiskEventLikeRow[];
}

export async function buildPostureReportMetrics(input: {
  supabase: SupabaseClient;
  userId: string;
  period: ReportPeriod;
  range: ReportRange;
}): Promise<PostureReportMetrics> {
  const { supabase, userId, period, range } = input;
  const previousRange = resolvePreviousRange(range);

  const [profile, dailyRows, previousDailyRows, sessions, slouchEvents, streakRow] = await Promise.all([
    selectProfile(supabase, userId),
    selectDailyScores(supabase, userId, range),
    selectDailyScores(supabase, userId, previousRange),
    selectSessions(supabase, userId, range),
    selectSlouchEvents(supabase, userId, range),
    supabase.from("user_streaks").select("current_streak").eq("user_id", userId).maybeSingle()
  ]);

  const dailyScores = dailyRows.map((row) => ({
    date: row.date,
    avg_score: Number(toNumber(row.avg_score, 0).toFixed(2)),
    sessions_count: Math.max(0, Math.round(toNumber(row.sessions_count, 0)))
  }));

  const averagePostureScore = Number(average(dailyScores.map((row) => row.avg_score)).toFixed(1));
  const previousAverage = Number(
    average(previousDailyRows.map((row) => toNumber(row.avg_score, 0))).toFixed(1)
  );
  const improvementVsPreviousPeriod = Number((averagePostureScore - previousAverage).toFixed(1));

  const totalSittingTimeSeconds = Math.round(
    sessions.reduce((sum, session) => sum + Math.max(0, toNumber(session.duration_seconds, 0)), 0)
  );
  const fatigueIndex = Number(
    clampScore(average(sessions.map((session) => toNumber(session.avg_fatigue, 0)))).toFixed(1)
  );

  // We infer neck and shoulder indicators from aggregate posture metrics when dedicated raw angles are unavailable.
  const neckTiltDeviationAverage = Number(
    clampScore(average(sessions.map((session) => 100 - clampScore(toNumber(session.avg_alignment, 0))))).toFixed(1)
  );
  const shoulderImbalancePercent = Number(
    clampScore(average(sessions.map((session) => 100 - clampScore(toNumber(session.avg_symmetry, 0))))).toFixed(1)
  );

  const riskLevelClassification = maxRisk(sessions.map((session) => String(session.peak_risk ?? "LOW")));
  const { aiInsightsSummary, recommendedCorrections } = buildInsights({
    avgScore: averagePostureScore,
    fatigueIndex,
    riskLevel: riskLevelClassification,
    improvement: improvementVsPreviousPeriod,
    slouchEvents: slouchEvents.length
  });

  return {
    userId,
    userName: profile.full_name?.trim() || "PostureX User",
    userEmail: profile.email?.trim() || "",
    period,
    range,
    averagePostureScore,
    dailyScores,
    totalSittingTimeSeconds,
    slouchEventsCount: slouchEvents.length,
    neckTiltDeviationAverage,
    shoulderImbalancePercent,
    fatigueIndex,
    improvementVsPreviousPeriod,
    aiInsightsSummary,
    recommendedCorrections,
    streakDays: Math.max(0, Math.round(toNumber((streakRow.data as { current_streak?: number } | null)?.current_streak, 0))),
    riskLevelClassification
  };
}
