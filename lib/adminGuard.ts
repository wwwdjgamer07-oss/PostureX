import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isPrimaryAdminEmail } from "@/lib/adminAccess";

export const ADMIN_OTP_COOKIE = "px_admin_otp_verified";

export function isAdminOtpRequired() {
  const configured = String(process.env.ADMIN_OTP_CODE ?? "").trim();
  return configured.length > 0;
}

export function isAdminOtpVerified() {
  return cookies().get(ADMIN_OTP_COOKIE)?.value === "1";
}

export function resolveExpectedAdminOtp() {
  const configured = String(process.env.ADMIN_OTP_CODE ?? "").trim();
  // Fallback for local development if env var is not provided.
  return configured.length > 0 ? configured : "deepthan";
}

export function canAccessAdmin(email: string | null | undefined, role: string | null | undefined) {
  return String(role ?? "").toUpperCase() === "ADMIN" || isPrimaryAdminEmail(email);
}

export async function getUserRole(supabase: SupabaseClient, userId: string) {
  const { data: profile } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
  return String((profile as { role?: string } | null)?.role ?? "");
}

export async function auditAdminAccess(input: {
  userId: string;
  eventName: string;
  path: string;
  ok: boolean;
  detail?: Record<string, unknown>;
}) {
  try {
    const admin = createAdminSupabaseClient();
    await admin.from("analytics_events").insert({
      user_id: input.userId,
      event_name: input.eventName,
      payload: {
        path: input.path,
        ok: input.ok,
        ...input.detail
      }
    });
  } catch {
    // Audit failures should not block admin flow.
  }
}

