import { redirect } from "next/navigation";
import { HistoryClient } from "@/components/HistoryClient";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireProAccess } from "@/lib/subscriptionLifecycle";
import { SessionSummary } from "@/lib/types";

function isMissingSourceColumn(message: string | null | undefined) {
  const normalized = String(message ?? "").toLowerCase();
  return normalized.includes("source") && (normalized.includes("does not exist") || normalized.includes("schema cache"));
}

export default async function HistoryPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?next=/history");
  }

  await requireProAccess(supabase, user.id, "/pricing?plan=pro");

  const primarySessionQuery = await supabase
    .from("sessions")
    .select("id, user_id, started_at, ended_at, avg_alignment, avg_symmetry, avg_stability, avg_fatigue, peak_risk, duration_seconds, source")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(300);
  const sessionQuery = primarySessionQuery.error && isMissingSourceColumn(primarySessionQuery.error.message)
    ? await supabase
      .from("sessions")
      .select("id, user_id, started_at, ended_at, avg_alignment, avg_symmetry, avg_stability, avg_fatigue, peak_risk, duration_seconds")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(300)
    : primarySessionQuery;

  const sessions: SessionSummary[] =
    sessionQuery.data?.map((row) => ({
      id: row.id,
      userId: row.user_id,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      avgAlignment: Number(row.avg_alignment || 0),
      avgSymmetry: Number(row.avg_symmetry || 0),
      avgStability: Number(row.avg_stability || 0),
      avgFatigue: Number(row.avg_fatigue || 0),
      peakRisk: row.peak_risk,
      durationSeconds: Number(row.duration_seconds || 0),
      source: ((row as { source?: string }).source === "sensor" ? "sensor" : "camera")
    })) || [];

  return <HistoryClient sessions={sessions} />;
}
