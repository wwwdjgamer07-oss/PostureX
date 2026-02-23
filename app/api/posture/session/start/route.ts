import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { FREE_DAILY_SESSION_LIMIT, getUserPlanTierForClient } from "@/lib/planAccess";

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const planTier = await getUserPlanTierForClient(supabase, user.id, user.email);
  if (planTier === "FREE") {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const { count, error: countError } = await supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("started_at", dayStart.toISOString());

    if (countError) {
      return NextResponse.json({ error: countError.message || "Failed to validate session limit." }, { status: 500 });
    }

    if ((count ?? 0) >= FREE_DAILY_SESSION_LIMIT) {
      return NextResponse.json(
        {
          error: `Free plan allows ${FREE_DAILY_SESSION_LIMIT} sessions per day. Upgrade to continue.`,
          code: "plan_limit_reached",
          limit: FREE_DAILY_SESSION_LIMIT
        },
        { status: 403 }
      );
    }
  }

  let insertResult = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      started_at: new Date().toISOString(),
      break_taken: false
    })
    .select("id")
    .single();

  if (insertResult.error && insertResult.error.message?.toLowerCase().includes("break_taken")) {
    insertResult = await supabase
      .from("sessions")
      .insert({
        user_id: user.id,
        started_at: new Date().toISOString()
      })
      .select("id")
      .single();
  }

  if (insertResult.error) {
    return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ sessionId: insertResult.data.id });
}
