import { PREMIUM_FEATURE_KEYS } from "@/lib/constants";
import { isPrimaryAdminEmail } from "@/lib/adminAccess";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PlanTier } from "@/lib/types";

type PremiumFeatureKey = (typeof PREMIUM_FEATURE_KEYS)[keyof typeof PREMIUM_FEATURE_KEYS];

export async function getUserPlanTier(userId: string): Promise<PlanTier> {
  const supabase = createServerSupabaseClient();

  const { data: userPlan } = await supabase
    .from("users")
    .select("plan_tier,email")
    .eq("id", userId)
    .maybeSingle();

  const userEmail = typeof userPlan?.email === "string" ? userPlan.email : null;
  if (isPrimaryAdminEmail(userEmail)) {
    return "PRO";
  }

  if (userPlan?.plan_tier) {
    return userPlan.plan_tier as PlanTier;
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_tier, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (subscription?.status === "active" && subscription.plan_tier) {
    return subscription.plan_tier as PlanTier;
  }

  return "FREE";
}

export function hasPremiumFeature(plan: PlanTier, feature: PremiumFeatureKey) {
  if (plan === "PRO") return true;
  if (plan === "BASIC" && feature !== PREMIUM_FEATURE_KEYS.admin) return true;
  return false;
}
