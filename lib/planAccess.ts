import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanTier } from "@/lib/types";
import { isPrimaryAdminEmail } from "@/lib/adminAccess";

export const FREE_DAILY_SESSION_LIMIT = 3;

const PLAN_PRIORITY: Record<PlanTier, number> = {
  FREE: 0,
  BASIC: 1,
  PRO: 2
};

export function normalizePlanTier(value: unknown): PlanTier {
  const normalized = String(value ?? "").toUpperCase();
  if (normalized === "BASIC") return "BASIC";
  if (normalized === "PRO") return "PRO";
  return "FREE";
}

function isMissingTableInSchemaCache(message: string | null | undefined, tableName: string) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes(`public.${tableName.toLowerCase()}`) &&
    (normalized.includes("schema cache") || normalized.includes("does not exist"))
  );
}

export function isPlanAtLeast(current: PlanTier, required: PlanTier) {
  return PLAN_PRIORITY[current] >= PLAN_PRIORITY[required];
}

export function resolveGodPlan(email: string | null | undefined, tier: PlanTier): PlanTier {
  return isPrimaryAdminEmail(email) ? "PRO" : tier;
}

export async function getUserPlanTierForClient(supabase: SupabaseClient, userId: string, userEmail?: string | null): Promise<PlanTier> {
  if (isPrimaryAdminEmail(userEmail)) {
    return "PRO";
  }

  const { data: userPlan } = await supabase.from("users").select("plan_tier,email").eq("id", userId).maybeSingle();
  const userRow = (userPlan as { plan_tier?: unknown; email?: unknown } | null) ?? null;
  const profilePlan = normalizePlanTier(userRow?.plan_tier);
  const email = typeof userRow?.email === "string" ? userRow.email : userEmail ?? null;
  const profileWithGod = resolveGodPlan(email, profilePlan);
  if (profileWithGod !== "FREE") return profileWithGod;

  const { data: subscription, error: subscriptionError } = await supabase
    .from("subscriptions")
    .select("plan_tier,status")
    .eq("user_id", userId)
    .maybeSingle();

  if (subscriptionError) {
    if (isMissingTableInSchemaCache(subscriptionError.message, "subscriptions")) {
      return profilePlan;
    }
    return profilePlan;
  }

  const subscriptionStatus = String((subscription as { status?: unknown } | null)?.status ?? "").toLowerCase();
  if (subscriptionStatus === "active") {
    return resolveGodPlan(email, normalizePlanTier((subscription as { plan_tier?: unknown } | null)?.plan_tier));
  }

  return profileWithGod;
}
