import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AdminLiveClient } from "@/components/AdminLiveClient";
import { ADMIN_OTP_COOKIE, auditAdminAccess, isAdminOtpRequired } from "@/lib/adminGuard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isPrimaryAdminEmail } from "@/lib/adminAccess";

export default async function AdminLivePage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?next=/admin/live");
  }

  if (!isPrimaryAdminEmail(user.email)) {
    await auditAdminAccess({
      userId: user.id,
      eventName: "admin_live_denied",
      path: "/admin/live",
      ok: false
    });
    redirect("/dashboard");
  }

  if (isAdminOtpRequired() && cookies().get(ADMIN_OTP_COOKIE)?.value !== "1") {
    redirect("/admin/verify?next=/admin/live");
  }

  await auditAdminAccess({
    userId: user.id,
    eventName: "admin_live_access",
    path: "/admin/live",
    ok: true
  });

  const admin = createAdminSupabaseClient();
  const usersWithWalletResult = await admin
    .from("users")
    .select("id,email,full_name,role,plan_tier,created_at,updated_at,px_coins,px_gems")
    .order("created_at", { ascending: false })
    .limit(2000);
  let usersResult: { data: unknown[] | null; error: { message?: string } | null } = usersWithWalletResult as {
    data: unknown[] | null;
    error: { message?: string } | null;
  };
  if (usersWithWalletResult.error) {
    const message = usersWithWalletResult.error.message?.toLowerCase() ?? "";
    if (message.includes("updated_at")) {
      usersResult = (await admin
        .from("users")
        .select("id,email,full_name,role,plan_tier,created_at,px_coins,px_gems")
        .order("created_at", { ascending: false })
        .limit(2000)) as unknown as { data: unknown[] | null; error: { message?: string } | null };
    } else if (message.includes("px_coins") || message.includes("px_gems")) {
      usersResult = (await admin
        .from("users")
        .select("id,email,full_name,role,plan_tier,created_at,updated_at")
        .order("created_at", { ascending: false })
        .limit(2000)) as unknown as { data: unknown[] | null; error: { message?: string } | null };
    }
  }

  const users = (usersResult.data ?? []) as Array<Record<string, unknown>>;
  const userIds = users.map((u) => String(u.id));

  const [sessionsResult, recordsResult, breaksResult] = await Promise.all([
    admin
      .from("sessions")
      .select("id,user_id,started_at,ended_at,avg_alignment,avg_stability,avg_symmetry,duration_seconds,peak_risk,alert_count,source")
      .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"])
      .order("started_at", { ascending: false })
      .limit(5000),
    admin
      .from("posture_records")
      .select("user_id,session_id,captured_at,alignment,symmetry,stability,score,risk_level,source")
      .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"])
      .order("captured_at", { ascending: false })
      .limit(5000),
    admin
      .from("breaks")
      .select("user_id,taken")
      .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"])
      .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
  ]);

  const sessions = (sessionsResult.data ?? []) as Array<Record<string, unknown>>;
  const records = (recordsResult.data ?? []) as Array<Record<string, unknown>>;
  const breaks = (breaksResult.data ?? []) as Array<Record<string, unknown>>;

  const latestSessionByUser = new Map<string, Record<string, unknown>>();
  for (const row of sessions) {
    const uid = String(row.user_id ?? "");
    if (uid && !latestSessionByUser.has(uid)) latestSessionByUser.set(uid, row);
  }

  const latestRecordByUser = new Map<string, Record<string, unknown>>();
  for (const row of records) {
    const uid = String(row.user_id ?? "");
    if (uid && !latestRecordByUser.has(uid)) latestRecordByUser.set(uid, row);
  }

  const activeByUser = new Map<string, number>();
  for (const row of sessions) {
    if (!row.ended_at) {
      const uid = String(row.user_id ?? "");
      activeByUser.set(uid, (activeByUser.get(uid) ?? 0) + 1);
    }
  }

  const totalByUser = new Map<string, number>();
  for (const row of sessions) {
    const uid = String(row.user_id ?? "");
    totalByUser.set(uid, (totalByUser.get(uid) ?? 0) + 1);
  }

  const breaksByUser = new Map<string, { total: number; taken: number }>();
  for (const row of breaks) {
    const uid = String(row.user_id ?? "");
    const current = breaksByUser.get(uid) ?? { total: 0, taken: 0 };
    current.total += 1;
    if (Boolean(row.taken)) current.taken += 1;
    breaksByUser.set(uid, current);
  }

  const payload = {
    admin: { email: user.email ?? null },
    generated_at: new Date().toISOString(),
    summary: {
      users_total: users.length,
      sessions_total_loaded: sessions.length,
      sessions_active: sessions.filter((s) => !s.ended_at).length,
      records_total_loaded: records.length,
      average_live_score:
        users.length > 0
          ? Math.round(
              users.reduce((sum, u) => {
                const uid = String(u.id ?? "");
                const liveScore = Number(latestRecordByUser.get(uid)?.score ?? latestSessionByUser.get(uid)?.avg_alignment ?? 0);
                return sum + (Number.isFinite(liveScore) ? liveScore : 0);
              }, 0) / users.length
            )
          : 0
    },
    users: users.map((u) => {
      const uid = String(u.id ?? "");
      const latestSession = latestSessionByUser.get(uid) ?? null;
      const latestRecord = latestRecordByUser.get(uid) ?? null;
      const gems = ((u.px_gems as { blue?: number; purple?: number; gold?: number } | null) ?? {}) as {
        blue?: number;
        purple?: number;
        gold?: number;
      };
      const avgA = Number(latestSession?.avg_alignment ?? 0);
      const avgS = Number(latestSession?.avg_stability ?? 0);
      const avgY = Number(latestSession?.avg_symmetry ?? 0);
      const sessionScore = Math.round((avgA + avgS + avgY) / 3);

      return {
        id: uid,
        email: (u.email as string | null) ?? null,
        full_name: (u.full_name as string | null) ?? null,
        role: String(u.role ?? "USER").toUpperCase(),
        plan_tier: String(u.plan_tier ?? "FREE").toUpperCase(),
        created_at: (u.created_at as string | null) ?? null,
        updated_at: (u.updated_at as string | null) ?? null,
        wallet: {
          coins: Math.max(0, Math.floor(Number(u.px_coins ?? 0) || 0)),
          gems: {
            blue: Math.max(0, Math.floor(Number(gems.blue ?? 0) || 0)),
            purple: Math.max(0, Math.floor(Number(gems.purple ?? 0) || 0)),
            gold: Math.max(0, Math.floor(Number(gems.gold ?? 0) || 0))
          }
        },
        sessions: {
          total_known: totalByUser.get(uid) ?? 0,
          active: activeByUser.get(uid) ?? 0,
          latest: latestSession
            ? {
                id: String(latestSession.id ?? ""),
                started_at: String(latestSession.started_at ?? ""),
                ended_at: (latestSession.ended_at as string | null) ?? null,
                duration_seconds: Number(latestSession.duration_seconds ?? 0),
                peak_risk: String(latestSession.peak_risk ?? "LOW"),
                alert_count: Number(latestSession.alert_count ?? 0),
                source: (latestSession.source === "sensor" ? "sensor" : "camera") as "camera" | "sensor",
                score: Number.isFinite(sessionScore) ? sessionScore : 0
              }
            : null
        },
        posture_live: latestRecord
          ? {
              captured_at: String(latestRecord.captured_at ?? ""),
              score: Number(latestRecord.score ?? 0),
              alignment: Number(latestRecord.alignment ?? 0),
              symmetry: Number(latestRecord.symmetry ?? 0),
              stability: Number(latestRecord.stability ?? 0),
              risk_level: String(latestRecord.risk_level ?? "LOW"),
              source: (latestRecord.source === "sensor" ? "sensor" : "camera") as "camera" | "sensor"
            }
          : null,
        breaks_today: breaksByUser.get(uid) ?? { total: 0, taken: 0 }
      };
    })
  };

  return <AdminLiveClient initial={payload} />;
}
