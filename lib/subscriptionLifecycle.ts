import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanTier } from "@/lib/types";

export type UserPlanType = "free" | "pro_week" | "pro_month";
export type UserPlanStatus = "active" | "expired";

export interface SubscriptionSnapshot {
  planType: UserPlanType;
  planStart: string | null;
  planEnd: string | null;
  planStatus: UserPlanStatus;
  subscriptionActive: boolean;
}

interface UserPlanRow {
  id: string;
  plan_tier?: string | null;
  plan_type?: string | null;
  plan_start?: string | null;
  plan_end?: string | null;
  plan_status?: string | null;
  subscription_active?: boolean | null;
}

function normalizePlanType(value: unknown): UserPlanType {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "pro_week") return "pro_week";
  if (normalized === "pro_month") return "pro_month";
  return "free";
}

function normalizePlanStatus(value: unknown): UserPlanStatus {
  return String(value ?? "").toLowerCase() === "active" ? "active" : "expired";
}

function tierFromPlanType(planType: UserPlanType): PlanTier {
  return planType === "free" ? "FREE" : "PRO";
}

export function getPlanEndFromNow(planType: Exclude<UserPlanType, "free">, start = new Date()) {
  const days = planType === "pro_week" ? 7 : 30;
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isProActive(input: {
  planStatus?: unknown;
  planEnd?: unknown;
  subscriptionActive?: unknown;
  planType?: unknown;
}) {
  const planType = normalizePlanType(input.planType);
  const activeFlag = Boolean(input.subscriptionActive);
  const status = normalizePlanStatus(input.planStatus);
  const planEndDate = input.planEnd ? new Date(String(input.planEnd)) : null;
  const hasValidEnd = Boolean(planEndDate && Number.isFinite(planEndDate.getTime()) && planEndDate.getTime() > Date.now());
  return planType !== "free" && activeFlag && status === "active" && hasValidEnd;
}

export async function syncSubscriptionExpiry(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionSnapshot | null> {
  const { data } = await supabase
    .from("users")
    .select("id,plan_tier,plan_type,plan_start,plan_end,plan_status,subscription_active")
    .eq("id", userId)
    .maybeSingle();
  const row = (data as UserPlanRow | null) ?? null;
  if (!row) return null;

  const planType = normalizePlanType(row.plan_type);
  const planStatus = normalizePlanStatus(row.plan_status);
  const planEnd = row.plan_end;
  const active = isProActive({
    planType,
    planStatus,
    planEnd,
    subscriptionActive: row.subscription_active
  });

  if (!active && planStatus !== "expired") {
    await supabase
      .from("users")
      .update({
        plan_tier: "FREE",
        plan_type: "free",
        plan_status: "expired",
        subscription_active: false
      })
      .eq("id", userId);
    return {
      planType: "free",
      planStart: row.plan_start ?? null,
      planEnd: row.plan_end ?? null,
      planStatus: "expired",
      subscriptionActive: false
    };
  }

  return {
    planType,
    planStart: row.plan_start ?? null,
    planEnd: row.plan_end ?? null,
    planStatus,
    subscriptionActive: Boolean(row.subscription_active)
  };
}

export async function activatePaidPlan(
  supabase: SupabaseClient,
  userId: string,
  planType: Exclude<UserPlanType, "free">
) {
  const planStart = new Date();
  const planEnd = getPlanEndFromNow(planType, planStart);
  const planTier = tierFromPlanType(planType);

  const { error } = await supabase
    .from("users")
    .update({
      plan_tier: planTier,
      plan_type: planType,
      plan_start: planStart.toISOString(),
      plan_end: planEnd.toISOString(),
      plan_status: "active",
      subscription_active: true
    })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message || "Failed to activate paid plan.");
  }

  return { planStart, planEnd, planTier };
}

export async function requireProAccess(supabase: SupabaseClient, userId: string, redirectTo = "/pricing") {
  const snapshot = await syncSubscriptionExpiry(supabase, userId);
  if (!snapshot || !isProActive(snapshot)) {
    redirect(redirectTo);
  }
}
