import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function todayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = todayUtcDate();
  const { data, error } = await supabase
    .from("daily_metrics")
    .select("id,user_id,date,avg_score,total_sessions,total_duration,created_at")
    .eq("user_id", user.id)
    .eq("date", today)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    daily_metrics: {
      avg_score: Number(data?.avg_score ?? 0),
      total_sessions: Number(data?.total_sessions ?? 0),
      total_duration: Number(data?.total_duration ?? 0),
      date: data?.date ?? today
    }
  });
}

export async function POST() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("update_daily_metrics", { p_user_id: user.id });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : null;
  return NextResponse.json({
    daily_metrics: {
      avg_score: Number((row as { avg_score?: number } | null)?.avg_score ?? 0),
      total_sessions: Number((row as { total_sessions?: number } | null)?.total_sessions ?? 0),
      total_duration: Number((row as { total_duration?: number } | null)?.total_duration ?? 0)
    }
  });
}

