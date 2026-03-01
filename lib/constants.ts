import { PlanTier } from "./types";
import { PLAN_PRICES_INR } from "@/lib/pricing";

export const PLAN_PRICES: Record<PlanTier, { monthlyInr: number }> = {
  FREE: { monthlyInr: PLAN_PRICES_INR.FREE },
  BASIC: { monthlyInr: PLAN_PRICES_INR.BASIC },
  PRO: { monthlyInr: PLAN_PRICES_INR.PRO }
};

export const PLAN_FEATURES: Record<PlanTier, string[]> = {
  FREE: ["Limited posture sessions", "Basic analytics", "No PDF reports", "Community support"],
  BASIC: ["Unlimited sessions", "Posture analytics", "Risk alerts", "PDF reports", "Email support"],
  PRO: ["Advanced AI posture insights", "Session history", "Trend analytics", "Team dashboard", "Priority support"]
};

export const PREMIUM_FEATURE_KEYS = {
  analytics: "analytics",
  exports: "exports",
  voiceCoach: "voiceCoach",
  admin: "admin"
} as const;

export const RISK_COLORS = {
  LOW: "#00E5FF",
  MODERATE: "#29B6F6",
  HIGH: "#FFB300",
  SEVERE: "#FF7043",
  CRITICAL: "#FF1744"
};
