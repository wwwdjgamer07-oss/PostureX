import type { SupabaseClient } from "@supabase/supabase-js";
import { buildPostureReportMetrics } from "@/lib/reports/data";
import { sendReportEmail } from "@/lib/reports/email";
import { generatePosturePDF } from "@/lib/reports/generatePosturePDF";
import { resolveReportRange } from "@/lib/reports/range";
import type { DeliveryResult, ReportPeriod } from "@/lib/reports/types";
import { isPrimaryAdminEmail } from "@/lib/adminAccess";

export interface UserDeliveryProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  plan_tier: string | null;
  email_reports_enabled: boolean | null;
  report_frequency: string | null;
  report_timezone: string | null;
}

function isEligiblePlan(plan: string | null, email?: string | null) {
  if (isPrimaryAdminEmail(email)) return true;
  const normalized = String(plan ?? "FREE").toUpperCase();
  return normalized === "BASIC" || normalized === "PRO";
}

function isValidTimezone(value: string | null | undefined) {
  if (!value) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function toTimeParts(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(now);

  const find = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    weekday: find("weekday"),
    hour: Number(find("hour")),
    minute: Number(find("minute"))
  };
}

function isDueForSchedule(profile: UserDeliveryProfile, now = new Date()) {
  const frequency = String(profile.report_frequency ?? "weekly").toLowerCase();
  const timeZone = isValidTimezone(profile.report_timezone) ? String(profile.report_timezone) : "UTC";
  const local = toTimeParts(now, timeZone);

  if (frequency === "daily") {
    return local.hour === 21 && local.minute < 15;
  }
  if (frequency === "weekly") {
    return local.weekday === "Sun" && local.hour === 20 && local.minute < 15;
  }
  return false;
}

function filenameFor(period: ReportPeriod, start: string, end: string) {
  return `PostureX_${period}_report_${start}_to_${end}.pdf`;
}

async function upsertDeliveryAttempt(input: {
  supabase: SupabaseClient;
  userId: string;
  period: ReportPeriod;
  start: string;
  end: string;
}) {
  const { supabase, userId, period, start, end } = input;
  const existing = await supabase
    .from("report_deliveries")
    .select("id,status,attempts")
    .eq("user_id", userId)
    .eq("period", period)
    .eq("period_start", start)
    .eq("period_end", end)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message || "Failed to load report delivery state.");
  }

  const row = existing.data as { id: string; status: string; attempts: number } | null;
  if (row?.status === "sent") {
    return { id: row.id, attempts: row.attempts, alreadySent: true };
  }

  if (!row) {
    const created = await supabase
      .from("report_deliveries")
      .insert({
        user_id: userId,
        period,
        period_start: start,
        period_end: end,
        status: "processing",
        attempts: 1
      })
      .select("id,attempts")
      .single();

    if (created.error || !created.data) {
      throw new Error(created.error?.message || "Failed to create report delivery log.");
    }
    return { id: created.data.id as string, attempts: Number((created.data as { attempts?: number }).attempts ?? 1), alreadySent: false };
  }

  const updated = await supabase
    .from("report_deliveries")
    .update({
      status: "processing",
      attempts: Number(row.attempts ?? 0) + 1,
      last_error: null
    })
    .eq("id", row.id)
    .select("id,attempts")
    .single();

  if (updated.error || !updated.data) {
    throw new Error(updated.error?.message || "Failed to update report delivery log.");
  }

  return { id: updated.data.id as string, attempts: Number((updated.data as { attempts?: number }).attempts ?? 1), alreadySent: false };
}

async function markDeliveryStatus(input: {
  supabase: SupabaseClient;
  deliveryId: string;
  status: "sent" | "failed";
  error?: string;
  provider?: string;
  providerMessageId?: string;
}) {
  const update: Record<string, unknown> = {
    status: input.status,
    last_error: input.error ?? null
  };

  if (input.status === "sent") {
    update.sent_at = new Date().toISOString();
    update.provider = input.provider ?? "smtp";
    update.provider_message_id = input.providerMessageId ?? null;
  }

  await input.supabase.from("report_deliveries").update(update).eq("id", input.deliveryId);
}

export async function deliverUserPostureReport(input: {
  supabase: SupabaseClient;
  user: UserDeliveryProfile;
  period: ReportPeriod;
  maxAttempts?: number;
}): Promise<DeliveryResult> {
  const maxAttempts = input.maxAttempts ?? 3;
  const user = input.user;
  const userEmail = String(user.email ?? "").trim();
  const userName = user.full_name?.trim() || "PostureX User";

  if (!user.email_reports_enabled) return { ok: false, reason: "disabled" };
  if (!isEligiblePlan(user.plan_tier, user.email)) return { ok: false, reason: "plan_not_eligible" };
  if (!userEmail) return { ok: false, error: "User email is missing." };

  const range = resolveReportRange(input.period);
  const attemptState = await upsertDeliveryAttempt({
    supabase: input.supabase,
    userId: user.id,
    period: input.period,
    start: range.start,
    end: range.end
  });

  if (attemptState.alreadySent) {
    return { ok: false, reason: "already_sent" };
  }

  const baselineAttempt = Math.max(1, attemptState.attempts);
  let lastError = "Unknown report delivery failure.";

  for (let attempt = baselineAttempt; attempt <= maxAttempts; attempt += 1) {
    try {
      const metrics = await buildPostureReportMetrics({
        supabase: input.supabase,
        userId: user.id,
        period: input.period,
        range
      });
      const pdfBuffer = await generatePosturePDF(metrics);
      const emailResult = await sendReportEmail({
        to: userEmail,
        name: userName,
        period: input.period,
        periodLabel: `${range.start} to ${range.end}`,
        pdfBuffer,
        filename: filenameFor(input.period, range.start, range.end)
      });

      await markDeliveryStatus({
        supabase: input.supabase,
        deliveryId: attemptState.id,
        status: "sent",
        provider: emailResult.provider ?? "smtp",
        providerMessageId: emailResult.messageId
      });

      return { ok: true, messageId: emailResult.messageId };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unexpected error while sending report.";
      if (attempt >= maxAttempts) {
        break;
      }
    }
  }

  await markDeliveryStatus({
    supabase: input.supabase,
    deliveryId: attemptState.id,
    status: "failed",
    error: lastError
  });
  return { ok: false, error: lastError };
}

export async function deliverScheduledReports(input: { supabase: SupabaseClient; now?: Date }) {
  const now = input.now ?? new Date();
  const { data, error } = await input.supabase
    .from("users")
    .select("id,email,full_name,plan_tier,email_reports_enabled,report_frequency,report_timezone")
    .eq("email_reports_enabled", true);

  if (error) {
    throw new Error(error.message || "Failed to load report recipients.");
  }

  const users = ((data ?? []) as UserDeliveryProfile[]).filter((row) => {
    const frequency = String(row.report_frequency ?? "weekly").toLowerCase();
    return (frequency === "daily" || frequency === "weekly") && isEligiblePlan(row.plan_tier, row.email);
  });

  const results: Array<{ userId: string; period: ReportPeriod; result: DeliveryResult }> = [];
  for (const user of users) {
    if (!isDueForSchedule(user, now)) continue;
    const period = String(user.report_frequency).toLowerCase() === "daily" ? "daily" : "weekly";
    const result = await deliverUserPostureReport({
      supabase: input.supabase,
      user,
      period
    });
    results.push({ userId: user.id, period, result });
  }

  return results;
}
