"use client";

import { createClient } from "@/lib/supabase/client";
import { notify } from "@/lib/notify";

export interface PaymentInput {
  plan: "basic" | "pro" | "pro_weekly";
  amountInr: 1 | 2;
}

export async function createPayment(input: PaymentInput) {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Please sign in before submitting payment.");
  }

  const { error } = await supabase.from("payments").insert({
    user_id: user.id,
    plan: input.plan,
    amount_inr: input.amountInr,
    payment_method: "UPI",
    status: "pending"
  });

  if (error) {
    throw new Error(error.message || "Failed to record payment.");
  }

  try {
    await notify(supabase, user.id, "Payment submitted", "Your UPI payment is pending admin verification.", "payment");
  } catch {
    // Payment record is the primary action; notification failures should not block the flow.
  }
}
