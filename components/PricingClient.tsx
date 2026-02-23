"use client";

import { PricingIndiaClient } from "@/components/PricingIndiaClient";
import type { PlanTier } from "@/lib/types";

interface Props {
  currentPlan: PlanTier;
  userId?: string | null;
}

export function PricingClient({ currentPlan, userId = null }: Props) {
  return <PricingIndiaClient currentPlan={currentPlan} userId={userId} />;
}
