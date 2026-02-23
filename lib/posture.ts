import { createClient } from "@/lib/supabase/client";
import { SessionSummary } from "@/lib/types";
import { normalizeRisk } from "@/lib/normalizeRisk";

export async function savePostureSession(session: Partial<SessionSummary>) {
  const supabase = createClient();
  const payload = { ...session } as Record<string, unknown>;

  if ("peak_risk" in payload) {
    const value = payload.peak_risk as string | number | null | undefined;
    payload.peak_risk = normalizeRisk(value);
  }

  return await supabase
    .from("sessions")
    .insert([payload])
    .select()
    .single();
}

export async function getUserSessions(userId: string) {
  const supabase = createClient();
  return await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .order("started_at", { ascending: false });
}
