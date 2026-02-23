import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";
import { getUserPlanTierForClient } from "@/lib/planAccess";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { deliverUserPostureReport } from "@/lib/reports/service";
import type { UserDeliveryProfile } from "@/lib/reports/service";

export async function POST(request: Request) {
  const { error, supabase, user } = await requireApiUser();
  if (error || !user) return error;

  const planTier = await getUserPlanTierForClient(supabase, user.id, user.email);

  if (planTier === "FREE") {
    return NextResponse.json({ error: "Email reports are available on BASIC and PRO plans." }, { status: 403 });
  }

  let period: "daily" | "weekly" = "weekly";
  try {
    const body = (await request.json()) as { period?: unknown };
    const requested = String(body.period ?? "").toLowerCase();
    if (requested === "daily" || requested === "weekly") {
      period = requested;
    }
  } catch {
    // Keep default period
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
    return NextResponse.json({ success: false, error: result.error || result.reason || "Failed to send report email." }, { status: 500 });
  }

  return NextResponse.json({ success: true, period, messageId: result.messageId ?? null });
}
