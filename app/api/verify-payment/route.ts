import { NextResponse } from "next/server";
import crypto from "node:crypto";
import Razorpay from "razorpay";
import { requireApiUser } from "@/lib/api";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type PaidPlan = "BASIC" | "PRO" | "PRO_WEEKLY";

const PLAN_PRICES_INR: Record<PaidPlan, number> = {
  BASIC: 1,
  PRO: 2,
  PRO_WEEKLY: 1
};

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

export async function POST(request: Request) {
  const { error, user } = await requireApiUser();
  if (error || !user) return error;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Razorpay server keys are not configured." }, { status: 500 });
  }

  let payload: {
    razorpay_payment_id?: unknown;
    razorpay_order_id?: unknown;
    razorpay_signature?: unknown;
    userId?: unknown;
    planId?: unknown;
  };
  try {
    payload = (await request.json()) as {
      razorpay_payment_id?: unknown;
      razorpay_order_id?: unknown;
      razorpay_signature?: unknown;
      userId?: unknown;
      planId?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const paymentId = String(payload.razorpay_payment_id ?? "");
  const orderId = String(payload.razorpay_order_id ?? "");
  const signature = String(payload.razorpay_signature ?? "");
  const requestUserId = String(payload.userId ?? "");
  const plan = normalizePlan(payload.planId);

  if (!paymentId || !orderId || !signature) {
    return NextResponse.json({ error: "Payment verification payload is incomplete." }, { status: 400 });
  }
  if (!plan) {
    return NextResponse.json({ error: "Invalid planId. Use BASIC, PRO, or PRO_WEEKLY." }, { status: 400 });
  }
  if (!requestUserId || requestUserId !== user.id) {
    return NextResponse.json({ error: "Invalid userId." }, { status: 403 });
  }

  const validSignature = verifyRazorpaySignature(orderId, paymentId, signature, keySecret);

  if (!validSignature) {
    return NextResponse.json({ success: false, error: "Invalid Razorpay signature." }, { status: 400 });
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

  try {
    const payment = await razorpay.payments.fetch(paymentId);
    const expectedAmountPaise = PLAN_PRICES_INR[plan] * 100;

    if (payment.status !== "captured" && payment.status !== "authorized") {
      return NextResponse.json({ success: false, error: "Payment is not captured yet." }, { status: 400 });
    }

    if (Number(payment.amount ?? 0) !== expectedAmountPaise) {
      return NextResponse.json({ success: false, error: "Payment amount mismatch." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ success: false, error: "Unable to validate payment with Razorpay." }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const planTier = resolvePlanTier(plan);
  const billingInterval = resolveBillingInterval(plan);
  const expiryDate = new Date(now.getTime() + resolvePeriodDays(plan) * 24 * 60 * 60 * 1000);
  const expiryIso = expiryDate.toISOString();
  const planLower = plan.toLowerCase();

  let shouldSkipPaymentLogging = false;
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
      shouldSkipPaymentLogging = true;
      paymentWritePromise = Promise.resolve({ error: null });
    } else {
      return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
  } else if (existingApproved?.id) {
    return NextResponse.json({
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
        shouldSkipPaymentLogging = true;
        paymentWritePromise = Promise.resolve({ error: null });
      } else {
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
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
            amount_inr: PLAN_PRICES_INR[plan],
            payment_method: "RAZORPAY",
            status: "approved"
          });
    }
  }

  const [userUpdate, subUpdate, paymentWrite] = await Promise.all([
    admin.from("users").update({ plan_tier: planTier }).eq("id", user.id),
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
      console.warn("[verify-payment] subscriptions table unavailable. Plan activated via users.plan_tier only.");
    } else {
      return NextResponse.json({ success: false, error: subMessage || "Failed to persist subscription." }, { status: 500 });
    }
  }

  const dbError = userUpdate.error || paymentWrite.error;
  if (dbError) {
    const errMessage = dbError.message || "Failed to activate subscription.";
    if (isMissingPaymentsTableError(errMessage)) {
      shouldSkipPaymentLogging = true;
    } else {
      return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
    }
  }

  if (shouldSkipPaymentLogging) {
    console.warn("[verify-payment] payments table unavailable. Subscription activated without payment log persistence.");
  }

  if (userUpdate.error || (subUpdate.error && !skipSubscriptionPersistence)) {
    const activationErrorMessage =
      userUpdate.error?.message ||
      (skipSubscriptionPersistence ? null : subUpdate.error?.message) ||
      dbError?.message ||
      "Failed to activate subscription.";
    return NextResponse.json({ success: false, error: activationErrorMessage }, { status: 500 });
  }

  await admin.from("notifications").insert({
    user_id: user.id,
    title: "Plan activated",
    message: `Your ${planTier}${billingInterval === "weekly" ? " weekly" : ""} subscription is active now.`,
    type: "plan",
    read: false
  });

  return NextResponse.json({
    success: true,
    plan: planTier,
    startDate: nowIso,
    expiryDate: expiryIso
  });
}
