import { PricingIndiaClient } from "@/components/PricingIndiaClient";
import { getUserPlanTierForClient } from "@/lib/planAccess";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PlanTier } from "@/lib/types";

export default async function PricingPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  let currentPlan: PlanTier = "FREE";

  if (user) {
    currentPlan = await getUserPlanTierForClient(supabase, user.id, user.email);
  }

  return <PricingIndiaClient currentPlan={currentPlan} userId={user?.id ?? null} />;
}
