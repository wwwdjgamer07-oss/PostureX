import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { AdminClient } from "@/components/AdminClient";
import { isPrimaryAdminEmail } from "@/lib/adminAccess";
import { ADMIN_OTP_COOKIE, auditAdminAccess, isAdminOtpRequired } from "@/lib/adminGuard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

interface PendingPayment {
  id: string;
  user_id: string | null;
  plan: string | null;
  amount_inr: number | null;
  status: string | null;
  created_at: string;
  user_email?: string;
}

export default async function AdminPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?next=/admin");
  }

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();

  const canAccessAdmin = profile?.role === "ADMIN" || isPrimaryAdminEmail(user.email);
  if (!canAccessAdmin) {
    await auditAdminAccess({
      userId: user.id,
      eventName: "admin_page_denied",
      path: "/admin",
      ok: false
    });
    redirect("/dashboard");
  }

  if (isAdminOtpRequired() && cookies().get(ADMIN_OTP_COOKIE)?.value !== "1") {
    redirect("/admin/verify?next=/admin");
  }

  await auditAdminAccess({
    userId: user.id,
    eventName: "admin_page_access",
    path: "/admin",
    ok: true
  });

  const [{ count: userCount }, { count: activeSessions }] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("sessions").select("id", { count: "exact", head: true }).is("ended_at", null)
  ]);

  const { data: planRows } = await supabase.from("users").select("plan_tier");
  const planCounts = { FREE: 0, BASIC: 0, PRO: 0 };

  for (const row of planRows ?? []) {
    const tier = String(row.plan_tier ?? "FREE").toUpperCase();
    if (tier === "BASIC") {
      planCounts.BASIC += 1;
    } else if (tier === "PRO") {
      planCounts.PRO += 1;
    } else {
      planCounts.FREE += 1;
    }
  }

  const subscriptionBreakdown = [
    { plan: "FREE", count: planCounts.FREE },
    { plan: "BASIC", count: planCounts.BASIC },
    { plan: "PRO", count: planCounts.PRO }
  ];

  let pendingPayments: PendingPayment[] = [];

  try {
    const adminSupabase = createAdminSupabaseClient();
    const { data: paymentRows } = await adminSupabase
      .from("payments")
      .select("id,user_id,plan,amount_inr,status,created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(25);

    const userIds = Array.from(new Set((paymentRows ?? []).map((item) => item.user_id).filter((id): id is string => Boolean(id))));
    const emailMap = new Map<string, string>();

    if (userIds.length > 0) {
      const { data: userRows } = await adminSupabase.from("users").select("id,email").in("id", userIds);
      for (const row of userRows ?? []) {
        emailMap.set(row.id, row.email ?? "");
      }
    }

    pendingPayments = (paymentRows ?? []).map((row) => ({
      ...(row as PendingPayment),
      user_email: row.user_id ? emailMap.get(row.user_id) ?? "" : ""
    }));
  } catch {
    pendingPayments = [];
  }

  const riskLevelBreakdown = [
    { level: "LOW", count: 450 },
    { level: "MODERATE", count: 280 },
    { level: "HIGH", count: 120 },
    { level: "SEVERE", count: 45 },
    { level: "CRITICAL", count: 12 }
  ];

  const heatmap = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    severity: Math.floor(Math.random() * 15)
  }));

  const estimatedMrr = planCounts.BASIC * 1 + planCounts.PRO * 2;

  return (
    <div className="px-shell space-y-4 py-8">
      <div className="px-panel p-4">
        <p className="text-xs text-slate-400">Admin Tools</p>
        <Link href="/admin/live" className="px-button mt-2 inline-flex">
          Open Live Global Admin View
        </Link>
      </div>
      <AdminClient
        userCount={userCount || 0}
        activeSessions={activeSessions || 0}
        estimatedMrr={estimatedMrr}
        subscriptionBreakdown={subscriptionBreakdown}
        riskLevelBreakdown={riskLevelBreakdown}
        heatmap={heatmap}
        pendingPayments={pendingPayments}
      />
    </div>
  );
}
