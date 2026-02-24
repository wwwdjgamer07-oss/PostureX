import crypto from "node:crypto";
import Razorpay from "razorpay";
import { requireApiUser } from "@/lib/api";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { parseJsonBody, sanitizeText } from "@/lib/api/request";
import { apiError, apiOk } from "@/lib/api/response";
import { activatePaidPlan, isProActive } from "@/lib/subscriptionLifecycle";

export const runtime = "nodejs";

type PaidPlan = "BASIC" | "PRO" | "PRO_WEEKLY";

const PLAN_PRICES_INR: Record<PaidPlan, number> = {
  BASIC: 1,
  PRO: 2,
  PRO_WEEKLY: 1
};

function normalizePlanTier(value: unknown): "FREE" | "BASIC" | "PRO" {
  const normalized = String(value ?? "").toUpperCase();
  if (normalized === "BASIC") return "BASIC";
  if (normalized === "PRO") return "PRO";
  return "FREE";
}

function resolveExpectedAmountInr(plan: PaidPlan, allowBasicToProUpgrade: boolean): number {
  if (allowBasicToProUpgrade && plan === "PRO") return 1;
  return PLAN_PRICES_INR[plan];
}

function isMissingPaymentsTableError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("public.payments") && normalized.includes("schema cache");
}

function isMissingSubscriptionsTableError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("public.subscriptions") && normalized.includes("schema cache");
}

function normalizePlan(planId: unknown): PaidPlan | null {
  const normalized = String(planId ?? "").toUpperCase();
  if (normalized === "BASIC" || normalized === "PRO") return normalized;
  if (normalized === "PRO_WEEKLY") return normalized;
  return null;
}

function resolvePlanTier(plan: PaidPlan): "BASIC" | "PRO" {
  return plan === "BASIC" ? "BASIC" : "PRO";
}

function resolveBillingInterval(plan: PaidPlan): "monthly" | "weekly" {
  return plan === "PRO_WEEKLY" ? "weekly" : "monthly";
}

function resolvePeriodDays(plan: PaidPlan): number {
  return plan === "PRO_WEEKLY" ? 7 : 30;
}

function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

const VerifyPaymentSchema = z.object({
  razorpay_payment_id: z.string().trim().min(1),
  razorpay_order_id: z.string().trim().min(1),
  razorpay_signature: z.string().trim().min(1),
  userId: z.string().trim().uuid(),
  planId: z.string().trim()
});

export async function POST(request: Request) {
  const { error, user } = await requireApiUser();
  if (error || !user) return error;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return apiError("Razorpay server keys are not configured.", 500, "RAZORPAY_CONFIG_MISSING");
  }

  const parsed = await parseJsonBody(request, VerifyPaymentSchema);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;

  const paymentId = sanitizeText(payload.razorpay_payment_id, 128);
  const orderId = sanitizeText(payload.razorpay_order_id, 128);
  const signature = sanitizeText(payload.razorpay_signature, 256);
  const requestUserId = sanitizeText(payload.userId, 64);
  const plan = normalizePlan(payload.planId);

  if (!paymentId || !orderId || !signature) {
    return apiError("Payment verification payload is incomplete.", 400, "INVALID_PAYLOAD");
  }
  if (!plan) {
    return apiError("Invalid planId. Use BASIC, PRO, or PRO_WEEKLY.", 400, "INVALID_PLAN");
  }
  if (!requestUserId || requestUserId !== user.id) {
    return apiError("Invalid userId.", 403, "FORBIDDEN");
  }

  const validSignature = verifyRazorpaySignature(orderId, paymentId, signature, keySecret);

  if (!validSignature) {
    return apiError("Invalid Razorpay signature.", 400, "INVALID_SIGNATURE");
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  const admin = createAdminSupabaseClient();
  const { data: membership } = await admin
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
  const expectedAmountInr = resolveExpectedAmountInr(plan, allowBasicToProUpgrade);

  try {
    const payment = await razorpay.payments.fetch(paymentId);
    const expectedAmountPaise = expectedAmountInr * 100;

    if (payment.status !== "captured" && payment.status !== "authorized") {
      return apiError("Payment is not captured yet.", 400, "PAYMENT_NOT_CAPTURED");
    }

    if (Number(payment.amount ?? 0) !== expectedAmountPaise) {
      return apiError("Payment amount mismatch.", 400, "PAYMENT_AMOUNT_MISMATCH");
    }
  } catch {
    return apiError("Unable to validate payment with Razorpay.", 400, "PAYMENT_VALIDATION_FAILED");
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const planTier = resolvePlanTier(plan);
  const billingInterval = resolveBillingInterval(plan);
  const expiryDate = new Date(now.getTime() + resolvePeriodDays(plan) * 24 * 60 * 60 * 1000);
  const expiryIso = expiryDate.toISOString();
  const planLower = plan.toLowerCase();
  if (activeMembership && !allowBasicToProUpgrade) {
    return apiOk({
      success: true,
      plan: planTier,
      startDate: nowIso,
      expiryDate: (membership as { plan_end?: string | null } | null)?.plan_end ?? expiryIso,
      redirectTo: "/dashboard"
    });
  }

  let paymentWritePromise: PromiseLike<{ error: { message?: string } | null }>;

  const { data: existingApproved, error: existingApprovedError } = await admin
    .from("payments")
    .select("id")
    .eq("user_id", user.id)
    .eq("plan", planLower)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingApprovedError) {
    const errorMessage = existingApprovedError.message || "Failed to validate payment state.";
    if (isMissingPaymentsTableError(errorMessage)) {
      paymentWritePromise = Promise.resolve({ error: null });
    } else {
      return apiError(errorMessage, 500, "PAYMENT_STATE_VALIDATION_FAILED");
    }
  } else if (existingApproved?.id) {
    return apiOk({
      success: true,
      plan: planTier,
      startDate: nowIso,
      expiryDate: expiryIso
    });
  } else {
    const { data: latestCreated, error: latestCreatedError } = await admin
      .from("payments")
      .select("id")
      .eq("user_id", user.id)
      .eq("plan", planLower)
      .eq("status", "created")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestCreatedError) {
      const errorMessage = latestCreatedError.message || "Failed to load payment record.";
      if (isMissingPaymentsTableError(errorMessage)) {
        paymentWritePromise = Promise.resolve({ error: null });
      } else {
        return apiError(errorMessage, 500, "PAYMENT_RECORD_LOAD_FAILED");
      }
    } else {
      paymentWritePromise = latestCreated?.id
        ? admin
            .from("payments")
            .update({
              status: "approved",
              payment_method: "RAZORPAY"
            })
            .eq("id", latestCreated.id)
        : admin.from("payments").insert({
            user_id: user.id,
            plan: planLower,
            amount_inr: expectedAmountInr,
            payment_method: "RAZORPAY",
            status: "approved"
          });
    }
  }

  const [planActivation, subUpdate, paymentWrite] = await Promise.all([
    activatePaidPlan(admin, user.id, plan === "PRO_WEEKLY" ? "pro_week" : "pro_month"),
    admin.from("subscriptions").upsert(
      {
        user_id: user.id,
        plan_tier: planTier,
        billing_interval: billingInterval,
        status: "active",
        trial_end: nowIso,
        current_period_end: expiryIso
      },
      { onConflict: "user_id" }
    ),
    paymentWritePromise
  ]);

  let skipSubscriptionPersistence = false;
  if (subUpdate.error) {
    const subMessage = subUpdate.error.message || "";
    if (isMissingSubscriptionsTableError(subMessage)) {
      skipSubscriptionPersistence = true;
    } else {
      return apiError(subMessage || "Failed to persist subscription.", 500, "SUBSCRIPTION_PERSISTENCE_FAILED");
    }
  }

  const dbError = paymentWrite.error;
  if (dbError) {
    const errMessage = dbError.message || "Failed to activate subscription.";
    if (isMissingPaymentsTableError(errMessage)) {
      // Non-blocking when payment table is unavailable.
    } else {
      return apiError(errMessage, 500, "PLAN_ACTIVATION_FAILED");
    }
  }

  if (!planActivation || (subUpdate.error && !skipSubscriptionPersistence)) {
    const activationErrorMessage =
      (skipSubscriptionPersistence ? null : subUpdate.error?.message) ||
      dbError?.message ||
      "Failed to activate subscription.";
    return apiError(String(activationErrorMessage), 500, "PLAN_ACTIVATION_FAILED");
  }

  await admin.from("notifications").insert({
    user_id: user.id,
    title: "Plan activated",
    message: `Your ${planTier}${billingInterval === "weekly" ? " weekly" : ""} subscription is active now.`,
    type: "plan",
    read: false
  });

  return apiOk({
    success: true,
    plan: planTier,
    startDate: nowIso,
    expiryDate: expiryIso
  });
}
