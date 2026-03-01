import Razorpay from "razorpay";
import { requireApiUser } from "@/lib/api";
import { z } from "zod";
import { parseJsonBody, sanitizeText } from "@/lib/api/request";
import { apiError, apiOk } from "@/lib/api/response";
import { isProActive } from "@/lib/subscriptionLifecycle";
import { resolveExpectedAmountInr, type PaidPlan } from "@/lib/pricing";

export const runtime = "nodejs";

function normalizePlanTier(value: unknown): "FREE" | "BASIC" | "PRO" {
  const normalized = String(value ?? "").toUpperCase();
  if (normalized === "BASIC") return "BASIC";
  if (normalized === "PRO") return "PRO";
  return "FREE";
}

function isMissingPaymentsTableError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("public.payments") && normalized.includes("schema cache");
}

function normalizePlan(planId: unknown): PaidPlan | null {
  const normalized = String(planId ?? "").toUpperCase();
  if (normalized === "BASIC" || normalized === "PRO") return normalized;
  if (normalized === "PRO_WEEKLY") return normalized;
  return null;
}

const CreateOrderSchema = z.object({
  planId: z.string().trim(),
  amount: z.number().finite(),
  userId: z.string().trim().uuid()
});

export async function POST(request: Request) {
  const { error, supabase, user } = await requireApiUser();
  if (error || !user) return error;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return apiError("Razorpay server keys are not configured.", 500, "RAZORPAY_CONFIG_MISSING");
  }

  const parsed = await parseJsonBody(request, CreateOrderSchema);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;

  const plan = normalizePlan(payload.planId);
  if (!plan) {
    return apiError("Invalid planId. Use BASIC, PRO, or PRO_WEEKLY.", 400, "INVALID_PLAN");
  }

  const requestUserId = sanitizeText(payload.userId, 64);
  if (!requestUserId || requestUserId !== user.id) {
    return apiError("Invalid userId.", 403, "FORBIDDEN");
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  const { data: membership } = await supabase
    .from("users")
    .select("plan_tier,plan_type,plan_end,plan_status,subscription_active")
    .eq("id", user.id)
    .maybeSingle();
  const activeMembership = isProActive({
    planType: (membership as { plan_type?: string | null } | null)?.plan_type,
    planEnd: (membership as { plan_end?: string | null } | null)?.plan_end,
    planStatus: (membership as { plan_status?: string | null } | null)?.plan_status,
    subscriptionActive: (membership as { subscription_active?: boolean | null } | null)?.subscription_active
  });
  const currentPlanTier = normalizePlanTier((membership as { plan_tier?: string | null } | null)?.plan_tier);
  const allowBasicToProUpgrade = activeMembership && currentPlanTier === "BASIC" && plan === "PRO";

  if (activeMembership && !allowBasicToProUpgrade) {
    return apiError("Membership is already active. Redirect to dashboard.", 409, "ALREADY_ACTIVE_MEMBERSHIP", {
      expiryDate: (membership as { plan_end?: string | null } | null)?.plan_end ?? null,
      redirectTo: "/dashboard"
    });
  }

  const expectedAmount = resolveExpectedAmountInr(plan, allowBasicToProUpgrade);
  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount !== expectedAmount) {
    return apiError(`Invalid amount for ${plan}.`, 400, "INVALID_AMOUNT");
  }

  try {
    const order = await razorpay.orders.create({
      amount: expectedAmount * 100,
      currency: "INR",
      receipt: `px_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        userId: user.id,
        planId: plan
      }
    });

    const { error: paymentInsertError } = await supabase.from("payments").insert({
      user_id: user.id,
      plan: plan.toLowerCase(),
      amount_inr: expectedAmount,
      payment_method: "RAZORPAY",
      status: "created"
    });

    if (paymentInsertError) {
      const message = paymentInsertError.message || "Failed to save payment intent.";
      if (!isMissingPaymentsTableError(message)) {
        return apiError(message, 500, "PAYMENT_LOG_PERSISTENCE_FAILED");
      }
    }

    return apiOk({ orderId: order.id, keyId });
  } catch (error) {
    const message =
      error && typeof error === "object" && "description" in error
        ? String((error as { description?: string }).description)
        : error instanceof Error
          ? error.message
          : "Failed to create Razorpay order.";
    const statusCode =
      error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode?: number }).statusCode)
        : 500;

    return apiError(
      message || "Failed to create Razorpay order.",
      Number.isFinite(statusCode) && statusCode >= 400 ? statusCode : 500,
      "RAZORPAY_ORDER_FAILED"
    );
  }
}
