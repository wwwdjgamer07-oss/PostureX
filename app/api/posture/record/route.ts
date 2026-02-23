import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { parseJsonBody, sanitizeText } from "@/lib/api/request";
import { apiError, apiOk } from "@/lib/api/response";

const RecordSchema = z.object({
  sessionId: z.string().trim().min(1),
  alignment: z.number().finite().optional(),
  symmetry: z.number().finite().optional(),
  stability: z.number().finite().optional(),
  fatigue: z.number().finite().optional(),
  score: z.number().finite().optional(),
  riskLevel: z.string().trim().optional(),
  timestamp: z.string().trim().optional(),
  source: z.enum(["sensor", "camera"]).optional()
});

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const parsed = await parseJsonBody(request, RecordSchema);
  if (!parsed.ok) return parsed.response;

  const { sessionId, alignment, symmetry, stability, fatigue, score, riskLevel, timestamp, source } = parsed.data;
  const safeSessionId = sanitizeText(sessionId, 128);
  if (!safeSessionId) return apiError("sessionId is required.", 400, "SESSION_ID_REQUIRED");

  const postureSource = source === "sensor" || source === "camera" ? source : "camera";

  const { data: sessionRow, error: sessionError } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", safeSessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sessionError) {
    return apiError(sessionError.message, 500, "SESSION_LOOKUP_FAILED");
  }
  if (!sessionRow) {
    return apiError("Session not found or access denied.", 404, "SESSION_NOT_FOUND");
  }

  let insertResult = await supabase
    .from("posture_records")
    .insert({
      user_id: user.id,
      session_id: safeSessionId,
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
        session_id: safeSessionId,
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
        session_id: safeSessionId,
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
    return apiError(insertResult.error.message, 500, "POSTURE_RECORD_INSERT_FAILED");
  }

  return apiOk({ success: true });
}
