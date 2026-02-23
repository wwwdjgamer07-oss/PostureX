import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sessionId, alignment, symmetry, stability, fatigue, score, riskLevel, timestamp, source } = body;
  if (typeof sessionId !== "string" || !sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const postureSource = source === "sensor" || source === "camera" ? source : "camera";

  const { data: sessionRow, error: sessionError } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }
  if (!sessionRow) {
    return NextResponse.json({ error: "Session not found or access denied." }, { status: 404 });
  }

  let insertResult = await supabase
    .from("posture_records")
    .insert({
      user_id: user.id,
      session_id: sessionId,
      alignment,
      symmetry,
      stability,
      fatigue,
      score,
      risk_level: riskLevel,
      captured_at: timestamp,
      source: postureSource
    });

  if (insertResult.error && insertResult.error.message?.toLowerCase().includes("source")) {
    insertResult = await supabase
      .from("posture_records")
      .insert({
        user_id: user.id,
        session_id: sessionId,
        alignment,
        symmetry,
        stability,
        fatigue,
        score,
        risk_level: riskLevel,
        captured_at: timestamp
      });
  }

  if (insertResult.error && insertResult.error.message?.toLowerCase().includes("captured_at")) {
    insertResult = await supabase
      .from("posture_records")
      .insert({
        user_id: user.id,
        session_id: sessionId,
        alignment,
        symmetry,
        stability,
        fatigue,
        score,
        risk_level: riskLevel,
        created_at: timestamp
      });
  }

  if (insertResult.error) {
    return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
