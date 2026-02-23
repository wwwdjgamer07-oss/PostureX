import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface DailyRow {
  date: string;
  avg_score: number | null;
  sessions_count: number | null;
}

interface SessionRow {
  started_at: string;
  duration_seconds: number | null;
}

function toDateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function shiftUtcDays(base: Date, delta: number) {
  const date = new Date(base);
  date.setUTCDate(date.getUTCDate() + delta);
  return date;
}

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const from = shiftUtcDays(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())), -13);
  const fromIso = from.toISOString();
  const fromDate = toDateKey(from);

  const [{ data: dailyRows, error: dailyError }, { data: sessionRows, error: sessionError }] = await Promise.all([
    supabase
      .from("daily_posture")
      .select("date, avg_score, sessions_count")
      .eq("user_id", user.id)
      .gte("date", fromDate)
      .order("date", { ascending: true }),
    supabase
      .from("sessions")
      .select("started_at, duration_seconds")
      .eq("user_id", user.id)
      .gte("started_at", fromIso)
  ]);

  if (dailyError) {
    return NextResponse.json({ error: dailyError.message }, { status: 500 });
  }
  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  const dailyMap = new Map<string, { avg_score: number; sessions_count: number }>();
  for (const row of (dailyRows ?? []) as DailyRow[]) {
    dailyMap.set(row.date, {
      avg_score: Number(row.avg_score ?? 0),
      sessions_count: Number(row.sessions_count ?? 0)
    });
  }

  const durationMap = new Map<string, number>();
  for (const row of (sessionRows ?? []) as SessionRow[]) {
    const key = toDateKey(new Date(row.started_at));
    durationMap.set(key, (durationMap.get(key) ?? 0) + Number(row.duration_seconds ?? 0));
  }

  const fourteenDays = Array.from({ length: 14 }, (_, i) => toDateKey(shiftUtcDays(from, i)));
  const currentWeekKeys = fourteenDays.slice(7);
  const previousWeekKeys = fourteenDays.slice(0, 7);

  const avgFor = (keys: string[]) => {
    const values = keys.map((key) => Number(dailyMap.get(key)?.avg_score ?? 0));
    const total = values.reduce((sum, value) => sum + value, 0);
    return values.length > 0 ? total / values.length : 0;
  };

  const currentAvg = avgFor(currentWeekKeys);
  const previousAvg = avgFor(previousWeekKeys);
  const improvementPct =
    previousAvg > 0 ? Number((((currentAvg - previousAvg) / previousAvg) * 100).toFixed(1)) : currentAvg > 0 ? 100 : 0;

  const weekly = currentWeekKeys.map((key) => ({
    date: key,
    avg_score: Number((dailyMap.get(key)?.avg_score ?? 0).toFixed(2)),
    total_duration: Number((durationMap.get(key) ?? 0).toFixed(0)),
    sessions_count: Number(dailyMap.get(key)?.sessions_count ?? 0)
  }));

  const totalSessions = weekly.reduce((sum, row) => sum + Number(row.sessions_count ?? 0), 0);
  const totalDuration = weekly.reduce((sum, row) => sum + Number(row.total_duration ?? 0), 0);

  return NextResponse.json({
    data: weekly,
    improvement_pct: improvementPct,
    summary: {
      avg_weekly_score: Number(currentAvg.toFixed(1)),
      total_sessions: totalSessions,
      total_duration: totalDuration
    }
  });
}
