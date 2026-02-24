import { requireApiUser } from "@/lib/api";
import { getUserPlanTierForClient } from "@/lib/planAccess";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { deliverUserPostureReport } from "@/lib/reports/service";
import type { UserDeliveryProfile } from "@/lib/reports/service";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/request";
import { apiError, apiOk } from "@/lib/api/response";
import { sendNotification } from "@/lib/pushServer";

const ReportEmailSchema = z.object({
  period: z.enum(["daily", "weekly"]).optional()
});

export async function POST(request: Request) {
  const { error, supabase, user } = await requireApiUser();
  if (error || !user) return error;

  const planTier = await getUserPlanTierForClient(supabase, user.id, user.email);

  if (planTier === "FREE") {
    return apiError("Email reports are available on BASIC and PRO plans.", 403, "PLAN_REQUIRED");
  }

  let period: "daily" | "weekly" = "weekly";
  const parsed = await parseJsonBody(request, ReportEmailSchema);
  if (parsed.ok && parsed.data.period) {
    period = parsed.data.period;
  }

  const admin = createAdminSupabaseClient();
  const { data: nameRow } = await admin.from("users").select("full_name").eq("id", user.id).maybeSingle();
  const profileRow: UserDeliveryProfile = {
    id: user.id,
    email: user.email ?? null,
    full_name: (nameRow as { full_name?: string | null } | null)?.full_name ?? null,
    plan_tier: planTier,
    email_reports_enabled: true,
    report_frequency: period,
    report_timezone: "UTC"
  };

  const result = await deliverUserPostureReport({
    supabase: admin,
    user: profileRow,
    period
  });

  if (!result.ok) {
    return apiError(result.error || result.reason || "Failed to send report email.", 500, "REPORT_EMAIL_FAILED");
  }

  await sendNotification(user.id, "Daily report ready", "Your posture report is ready to review.", "/icon.svg", "/dashboard");

  return apiOk({ success: true, period, messageId: result.messageId ?? null });
}
