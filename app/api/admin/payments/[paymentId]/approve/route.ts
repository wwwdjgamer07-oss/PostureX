import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";
import { cookies } from "next/headers";
import { ADMIN_OTP_COOKIE, auditAdminAccess, canAccessAdmin, getUserRole, isAdminOtpRequired } from "@/lib/adminGuard";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function toPlanTier(plan: string | null): "FREE" | "BASIC" | "PRO" {
  const normalized = String(plan ?? "").toLowerCase();
  if (normalized === "basic") return "BASIC";
  if (normalized === "pro" || normalized === "pro_weekly") return "PRO";
  return "FREE";
}

export async function POST(_request: Request, { params }: { params: { paymentId: string } }) {
  const { error, supabase, user } = await requireApiUser();
  if (error || !user) {
    return error;
  }

  const role = await getUserRole(supabase, user.id);
  if (!canAccessAdmin(user.email, role)) {
    await auditAdminAccess({
      userId: user.id,
      eventName: "admin_api_denied",
      path: "/api/admin/payments/approve",
      ok: false
    });
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (isAdminOtpRequired() && cookies().get(ADMIN_OTP_COOKIE)?.value !== "1") {
    return NextResponse.json({ error: "Admin OTP verification required." }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("id,user_id,plan,status")
    .eq("id", params.paymentId)
    .maybeSingle();

  if (paymentError || !payment) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  if (payment.status !== "pending") {
    return NextResponse.json({ error: "Payment is not pending." }, { status: 400 });
  }

  const planTier = toPlanTier(payment.plan);

  const { error: paymentUpdateError } = await admin
    .from("payments")
    .update({ status: "approved" })
    .eq("id", payment.id)
    .eq("status", "pending");

  if (paymentUpdateError) {
    return NextResponse.json({ error: paymentUpdateError.message || "Failed to approve payment." }, { status: 500 });
  }

  if (payment.user_id) {
    const { error: planUpdateError } = await admin.from("users").update({ plan_tier: planTier }).eq("id", payment.user_id);
    if (planUpdateError) {
      return NextResponse.json({ error: planUpdateError.message || "Failed to activate plan." }, { status: 500 });
    }

    await admin.from("notifications").insert({
      user_id: payment.user_id,
      title: "Plan activated",
      message: `Your ${planTier} plan is now active.`,
      type: "plan",
      read: false
    });
  }

  await auditAdminAccess({
    userId: user.id,
    eventName: "admin_api_approve_payment",
    path: "/api/admin/payments/approve",
    ok: true,
    detail: { paymentId: params.paymentId }
  });

  return NextResponse.json({ ok: true, message: `Payment approved. ${planTier} activated.` });
}
