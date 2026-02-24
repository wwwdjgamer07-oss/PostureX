import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";
import { notify } from "@/lib/notify";

export async function POST() {
  const { error, supabase, user } = await requireApiUser();
  if (error || !user) {
    return error;
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({
      plan_tier: "FREE",
      plan_type: "free",
      plan_status: "expired",
      subscription_active: false
    })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message || "Failed to activate free plan." }, { status: 500 });
  }

  try {
    await notify(supabase, user.id, "Plan updated", "Free plan activated instantly.", "plan");
  } catch {
    // Non-blocking notification failure.
  }

  return NextResponse.json({ ok: true, message: "Free plan activated instantly." });
}
