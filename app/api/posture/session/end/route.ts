import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notify";
import { normalizeRisk } from "@/lib/normalizeRisk";

function toPeakRiskNumber(value: string | number | null | undefined) {
  if (value === "MODERATE") return normalizeRisk("MEDIUM");
  if (value === "SEVERE" || value === "CRITICAL") return normalizeRisk("HIGH");
  return normalizeRisk(value);
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sessionId, avgAlignment, avgSymmetry, avgStability, avgFatigue, peakRisk, durationSeconds } = body;

  const { data: updatedSession, error } = await supabase
    .from("sessions")
    .update({
      ended_at: new Date().toISOString(),
      avg_alignment: avgAlignment,
      avg_symmetry: avgSymmetry,
      avg_stability: avgStability,
      avg_fatigue: avgFatigue,
      peak_risk: toPeakRiskNumber(peakRisk),
      duration_seconds: durationSeconds,
    })
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!updatedSession) {
    return NextResponse.json({ error: "Session not found or access denied." }, { status: 404 });
  }

  try {
    await notify(
      supabase,
      user.id,
      "Session completed",
      "Your posture report is ready",
      "session"
    );
  } catch {
    // Session completion should succeed even if notification insert fails.
  }

  return NextResponse.json({ success: true });
}
