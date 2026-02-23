import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { requireApiUser } from "@/lib/api";
import { getUserPlanTierForClient } from "@/lib/planAccess";

function isMissingSourceColumn(message: string | null | undefined) {
  const normalized = String(message ?? "").toLowerCase();
  return normalized.includes("source") && (normalized.includes("does not exist") || normalized.includes("schema cache"));
}

export async function GET(request: NextRequest) {
  const { error, supabase, user } = await requireApiUser();
  if (error || !user) return error;

  const planTier = await getUserPlanTierForClient(supabase, user.id, user.email);

  if (planTier === "FREE") {
    return NextResponse.json({ error: "CSV export is available on BASIC and PRO plans." }, { status: 403 });
  }

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  let query = supabase
    .from("sessions")
    .select("id, started_at, ended_at, avg_alignment, avg_symmetry, avg_stability, avg_fatigue, peak_risk, duration_seconds, source")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(1000);
  if (from) query = query.gte("started_at", from);
  if (to) query = query.lte("started_at", to);

  const primary = await query;
  let sessions = (primary.data ?? []) as Array<Record<string, unknown>>;
  let queryError = primary.error;
  if (queryError && isMissingSourceColumn(queryError.message)) {
    let legacyQuery = supabase
      .from("sessions")
      .select("id, started_at, ended_at, avg_alignment, avg_symmetry, avg_stability, avg_fatigue, peak_risk, duration_seconds")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(1000);
    if (from) legacyQuery = legacyQuery.gte("started_at", from);
    if (to) legacyQuery = legacyQuery.lte("started_at", to);
    const legacy = await legacyQuery;
    sessions = (legacy.data ?? []) as Array<Record<string, unknown>>;
    queryError = legacy.error;
  }
  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  const csv = Papa.unparse(
    sessions.map((session) => ({
      session_id: session.id,
      started_at: session.started_at,
      ended_at: session.ended_at,
      avg_alignment: session.avg_alignment,
      avg_symmetry: session.avg_symmetry,
      avg_stability: session.avg_stability,
      avg_fatigue: session.avg_fatigue,
      peak_risk: session.peak_risk,
      duration_seconds: session.duration_seconds,
      source: session.source ?? "camera"
    }))
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="posture-history-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}
