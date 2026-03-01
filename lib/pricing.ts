export type PaidPlan = "BASIC" | "PRO" | "PRO_WEEKLY";

export const PAID_PLAN_PRICES_INR: Record<PaidPlan, number> = {
  BASIC: 99,
  PRO: 199,
  PRO_WEEKLY: 79
};

export const PLAN_PRICES_INR = {
  FREE: 0,
  BASIC: PAID_PLAN_PRICES_INR.BASIC,
  PRO: PAID_PLAN_PRICES_INR.PRO
} as const;

export const BASIC_TO_PRO_UPGRADE_INR = Math.max(1, PAID_PLAN_PRICES_INR.PRO - PAID_PLAN_PRICES_INR.BASIC);

export function resolveExpectedAmountInr(plan: PaidPlan, allowBasicToProUpgrade: boolean) {
  if (allowBasicToProUpgrade && plan === "PRO") {
    return BASIC_TO_PRO_UPGRADE_INR;
  }
  return PAID_PLAN_PRICES_INR[plan];
}

export function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
}
