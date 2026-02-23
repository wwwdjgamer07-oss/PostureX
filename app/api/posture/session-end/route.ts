import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeRisk } from "@/lib/normalizeRisk";

interface SessionEndBody {
  score: number;
  duration: number;
  alert_count?: number;
  break_taken?: boolean;
  session_id?: string | null;
  source?: "camera" | "sensor";
}

interface SavedSessionRow {
  id: string;
  avg_alignment: number;
  avg_stability: number | null;
  avg_symmetry: number | null;
  peak_risk: number | null;
  duration_seconds: number;
  started_at: string;
  alert_count: number | null;
  break_taken: boolean | null;
  source: string | null;
}

function toRiskFromScore(score: number) {
  if (score >= 80) return "LOW";
  if (score >= 60) return "MODERATE";
  if (score >= 40) return "HIGH";
  return "SEVERE";
}

function toPeakRiskNumber(level: string) {
  if (level === "MODERATE") return normalizeRisk("MEDIUM");
  if (level === "SEVERE" || level === "CRITICAL") return normalizeRisk("HIGH");
  return normalizeRisk(level);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isPostureSource(value: unknown): value is "camera" | "sensor" {
  return value === "camera" || value === "sensor";
}

function todayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function isMissingColumnError(message: string | null | undefined, column: string) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    (normalized.includes(`column '${column.toLowerCase()}'`) && normalized.includes("does not exist")) ||
    (normalized.includes(column.toLowerCase()) && normalized.includes("schema cache"))
  );
}

function isPeakRiskTypeError(message: string | null | undefined) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("peak_risk") &&
    (normalized.includes("invalid input syntax for type numeric") ||
      normalized.includes("is of type numeric") ||
      normalized.includes("invalid input value for enum"))
  );
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SessionEndBody;
  try {
    body = (await request.json()) as SessionEndBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isFiniteNumber(body.score) || !isFiniteNumber(body.duration)) {
    return NextResponse.json({ error: "Invalid payload. Expected { score:number, duration:number }." }, { status: 400 });
  }

  const score = Math.max(0, Math.min(100, Number(body.score)));
  const riskLevel = toRiskFromScore(score);
  const peakRisk = toPeakRiskNumber(riskLevel);
  const duration = Math.max(0, Math.round(body.duration));
  const alertCount = isFiniteNumber(body.alert_count) ? Math.max(0, Math.round(body.alert_count)) : 0;
  const breakTaken = isBoolean(body.break_taken) ? body.break_taken : false;
  const source = isPostureSource(body.source) ? body.source : "camera";
  const now = new Date().toISOString();
  const today = todayUtcDate();

  let savedSession: SavedSessionRow | null = null;
  const selectColumnsBase = "id, avg_alignment, avg_stability, avg_symmetry, peak_risk, duration_seconds, started_at, source";
  const selectColumnsBaseLegacy = "id, avg_alignment, avg_stability, avg_symmetry, peak_risk, duration_seconds, started_at";
  const selectColumnsWithMeta = `${selectColumnsBase}, alert_count, break_taken`;
  const selectColumnsWithMetaLegacy = `${selectColumnsBaseLegacy}, alert_count, break_taken`;

  const updateSession = async (sessionId: string) => {
    const basePayload = {
      ended_at: now,
      avg_alignment: score,
      duration_seconds: duration,
      peak_risk: peakRisk
    };

    let updateResult = await supabase
      .from("sessions")
      .update({
        ...basePayload,
        alert_count: alertCount,
        break_taken: breakTaken,
        source
      })
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .select(selectColumnsWithMeta)
      .maybeSingle();

    if (updateResult.error && isMissingColumnError(updateResult.error.message, "break_taken")) {
      updateResult = await supabase
        .from("sessions")
        .update({
          ...basePayload,
          alert_count: alertCount,
          source
        })
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .select(`${selectColumnsBaseLegacy}, alert_count`)
        .maybeSingle();
    }

    if (updateResult.error && isMissingColumnError(updateResult.error.message, "source")) {
      updateResult = await supabase
        .from("sessions")
        .update({
          ...basePayload,
          alert_count: alertCount,
          break_taken: breakTaken
        })
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .select(selectColumnsWithMetaLegacy)
        .maybeSingle();
    }

    if (updateResult.error && isMissingColumnError(updateResult.error.message, "alert_count")) {
      updateResult = await supabase
        .from("sessions")
        .update({
          ...basePayload,
          break_taken: breakTaken,
          source
        })
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .select(`${selectColumnsBaseLegacy}, break_taken`)
        .maybeSingle();
    }

    if (updateResult.error && isMissingColumnError(updateResult.error.message, "break_taken")) {
      updateResult = await supabase
        .from("sessions")
        .update(basePayload)
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .select(selectColumnsBaseLegacy)
        .maybeSingle();
    }

    if (updateResult.error && isPeakRiskTypeError(updateResult.error.message)) {
      updateResult = await supabase
        .from("sessions")
        .update({
          ...basePayload,
          peak_risk: riskLevel,
          alert_count: alertCount,
          break_taken: breakTaken,
          source
        })
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .select(selectColumnsWithMeta)
        .maybeSingle();
    }

    return updateResult;
  };

  const insertSession = async () => {
    const basePayload = {
      user_id: user.id,
      started_at: now,
      ended_at: now,
      avg_alignment: score,
      duration_seconds: duration,
      peak_risk: peakRisk
    };

    let insertResult = await supabase
      .from("sessions")
      .insert({
        ...basePayload,
        alert_count: alertCount,
        break_taken: breakTaken,
        source
      })
      .select(selectColumnsWithMeta)
      .single();

    if (insertResult.error && isMissingColumnError(insertResult.error.message, "break_taken")) {
      insertResult = await supabase
        .from("sessions")
        .insert({
          ...basePayload,
          alert_count: alertCount,
          source
        })
        .select(`${selectColumnsBaseLegacy}, alert_count`)
        .single();
    }

    if (insertResult.error && isMissingColumnError(insertResult.error.message, "source")) {
      insertResult = await supabase
        .from("sessions")
        .insert({
          ...basePayload,
          alert_count: alertCount,
          break_taken: breakTaken
        })
        .select(selectColumnsWithMetaLegacy)
        .single();
    }

    if (insertResult.error && isMissingColumnError(insertResult.error.message, "alert_count")) {
      insertResult = await supabase
        .from("sessions")
        .insert({
          ...basePayload,
          break_taken: breakTaken,
          source
        })
        .select(`${selectColumnsBaseLegacy}, break_taken`)
        .single();
    }

    if (insertResult.error && isMissingColumnError(insertResult.error.message, "break_taken")) {
      insertResult = await supabase
        .from("sessions")
        .insert(basePayload)
        .select(selectColumnsBaseLegacy)
        .single();
    }

    if (insertResult.error && isPeakRiskTypeError(insertResult.error.message)) {
      insertResult = await supabase
        .from("sessions")
        .insert({
          ...basePayload,
          peak_risk: riskLevel,
          alert_count: alertCount,
          break_taken: breakTaken,
          source
        })
        .select(selectColumnsWithMeta)
        .single();
    }

    return insertResult;
  };

  if (typeof body.session_id === "string" && body.session_id.length > 0) {
    const sessionUpdate = await updateSession(body.session_id);

    if (sessionUpdate.error) {
      return NextResponse.json({ error: sessionUpdate.error.message }, { status: 500 });
    }
    if (sessionUpdate.data) {
      savedSession = sessionUpdate.data as SavedSessionRow;
    }
  }

  if (!savedSession) {
    const sessionInsert = await insertSession();

    if (sessionInsert.error) {
      return NextResponse.json({ error: sessionInsert.error.message }, { status: 500 });
    }
    savedSession = sessionInsert.data as SavedSessionRow;
  }

  if (!savedSession) {
    return NextResponse.json({ error: "Failed to persist session." }, { status: 500 });
  }

  const { data: dailyMetricsResult, error: dailyMetricsError } = await supabase.rpc("update_daily_metrics", { p_user_id: user.id });
  if (dailyMetricsError) {
    return NextResponse.json({ error: dailyMetricsError.message }, { status: 500 });
  }
  const dailyMetricsRow = Array.isArray(dailyMetricsResult) ? dailyMetricsResult[0] : null;

  const dailyFetch = await supabase
    .from("daily_posture")
    .select("id, avg_score, sessions_count")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  if (dailyFetch.error) {
    return NextResponse.json({ error: dailyFetch.error.message }, { status: 500 });
  }

  let sessionsToday = 1;
  let todayScore = score;

  if (dailyFetch.data) {
    const oldCount = Number(dailyFetch.data.sessions_count ?? 0);
    const oldAverage = Number(dailyFetch.data.avg_score ?? 0);
    sessionsToday = oldCount + 1;
    todayScore = (oldAverage * oldCount + score) / sessionsToday;

    const updateDaily = await supabase
      .from("daily_posture")
      .update({
        avg_score: todayScore,
        sessions_count: sessionsToday
      })
      .eq("id", dailyFetch.data.id);

    if (updateDaily.error) {
      return NextResponse.json({ error: updateDaily.error.message }, { status: 500 });
    }
  } else {
    const insertDaily = await supabase.from("daily_posture").insert({
      user_id: user.id,
      date: today,
      avg_score: score,
      sessions_count: 1
    });
    if (insertDaily.error) {
      return NextResponse.json({ error: insertDaily.error.message }, { status: 500 });
    }
  }

  const { data: streakResult, error: streakError } = await supabase.rpc("update_user_streak", { p_user_id: user.id });
  if (streakError) {
    return NextResponse.json({ error: streakError.message }, { status: 500 });
  }
  const streakRow = Array.isArray(streakResult) ? streakResult[0] : null;
  const streak = Number((streakRow as { current_streak?: number } | null)?.current_streak ?? 0);

  const { data: weeklyRows, error: weeklyError } = await supabase
    .from("daily_posture")
    .select("date, avg_score, sessions_count")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(7);

  if (weeklyError) {
    return NextResponse.json({ error: weeklyError.message }, { status: 500 });
  }

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

  return NextResponse.json({
    session: {
      id: savedSession.id,
      avg_alignment: Number(savedSession.avg_alignment ?? 0),
      stability: Number(savedSession.avg_stability ?? 0),
      symmetry: Number(savedSession.avg_symmetry ?? 0),
      risk_level: riskLevel,
      duration_seconds: Number(savedSession.duration_seconds ?? 0),
      started_at: String(savedSession.started_at),
      alert_count: Number(savedSession.alert_count ?? 0),
      break_taken: Boolean(savedSession.break_taken ?? breakTaken),
      source: (savedSession.source ?? source) as "camera" | "sensor"
    },
    today_score: Math.round(todayScore),
    streak,
    sessions_today: sessionsToday,
    breaks_today: Array.isArray(breaksTodayRows) ? breaksTodayRows.length : 0,
    last_break_at: lastBreakRow?.created_at ?? null,
    weekly_trend: ((weeklyRows ?? []) as Array<{ date: string; avg_score: number; sessions_count: number }>)
      .map((row) => ({
        date: row.date,
        avg_score: Number(row.avg_score ?? 0),
        sessions_count: Number(row.sessions_count ?? 0)
      }))
      .reverse(),
    daily_metrics: {
      avg_score: Number((dailyMetricsRow as { avg_score?: number } | null)?.avg_score ?? todayScore),
      total_sessions: Number((dailyMetricsRow as { total_sessions?: number } | null)?.total_sessions ?? sessionsToday),
      total_duration: Number((dailyMetricsRow as { total_duration?: number } | null)?.total_duration ?? duration)
    }
  });
}
