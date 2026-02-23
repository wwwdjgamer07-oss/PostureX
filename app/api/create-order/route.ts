import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { requireApiUser } from "@/lib/api";

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

function normalizePlan(planId: unknown): PaidPlan | null {
  const normalized = String(planId ?? "").toUpperCase();
  if (normalized === "BASIC" || normalized === "PRO") return normalized;
  if (normalized === "PRO_WEEKLY") return normalized;
  return null;
}

export async function POST(request: Request) {
  const { error, supabase, user } = await requireApiUser();
  if (error || !user) return error;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Razorpay server keys are not configured." }, { status: 500 });
  }

  let payload: { planId?: unknown; amount?: unknown; userId?: unknown };
  try {
    payload = (await request.json()) as { planId?: unknown; amount?: unknown; userId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const plan = normalizePlan(payload.planId);
  if (!plan) {
    return NextResponse.json({ error: "Invalid planId. Use BASIC, PRO, or PRO_WEEKLY." }, { status: 400 });
  }

  const requestUserId = String(payload.userId ?? "");
  if (!requestUserId || requestUserId !== user.id) {
    return NextResponse.json({ error: "Invalid userId." }, { status: 403 });
  }

  const expectedAmount = PLAN_PRICES_INR[plan];
  const amount = Number(payload.amount ?? 0);
  if (!Number.isFinite(amount) || amount !== expectedAmount) {
    return NextResponse.json({ error: `Invalid amount for ${plan}.` }, { status: 400 });
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

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
        return NextResponse.json({ error: message }, { status: 500 });
      }
      // Non-blocking: allow checkout to proceed even if payment logging table is unavailable.
      console.warn("[create-order] Skipping payment intent persistence because payments table is unavailable.");
    }

    return NextResponse.json({ orderId: order.id });
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

    console.error("[create-order] Razorpay order creation failed", {
      userId: user.id,
      plan,
      amount: expectedAmount,
      statusCode,
      message
    });

    return NextResponse.json(
      {
        error: message || "Failed to create Razorpay order."
      },
      { status: Number.isFinite(statusCode) && statusCode >= 400 ? statusCode : 500 }
    );
  }
}
