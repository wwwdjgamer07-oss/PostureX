"use client";

import { createClient } from "@/lib/supabase/client";

interface UserMembershipRow {
  plan_tier?: string | null;
  plan_end?: string | null;
  subscription_active?: boolean | null;
}

export async function resolveStartRoute() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return "/pricing";

  const { data } = await supabase
    .from("users")
    .select("plan_tier,plan_end,subscription_active")
    .eq("id", user.id)
    .maybeSingle();

  const row = (data as UserMembershipRow | null) ?? null;
  const subscriptionActive = Boolean(row?.subscription_active);
  const planExpiry = row?.plan_end ? new Date(String(row.plan_end)) : null;
  const hasValidExpiry = Boolean(planExpiry && Number.isFinite(planExpiry.getTime()) && planExpiry.getTime() > Date.now());

  if (subscriptionActive && hasValidExpiry) return "/dashboard";
  return "/pricing";
}
