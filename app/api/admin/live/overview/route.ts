import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";
import { cookies } from "next/headers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { isPrimaryAdminEmail } from "@/lib/adminAccess";
import { ADMIN_OTP_COOKIE, auditAdminAccess, canAccessAdmin, getUserRole, isAdminOtpRequired } from "@/lib/adminGuard";

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  plan_tier: string | null;
  created_at: string | null;
  updated_at: string | null;
  px_coins?: number | null;
  px_gems?: { blue?: number; purple?: number; gold?: number } | null;
};

type SessionRow = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  avg_alignment: number | null;
  avg_stability: number | null;
  avg_symmetry: number | null;
  duration_seconds: number | null;
  peak_risk: string | null;
  alert_count?: number | null;
  source?: "camera" | "sensor" | null;
};

type PostureRecordRow = {
  user_id: string;
  session_id: string;
  captured_at: string;
  alignment: number | null;
  symmetry: number | null;
  stability: number | null;
  score: number | null;
  risk_level: string | null;
  source?: "camera" | "sensor" | null;
};

type BreakRow = {
  user_id: string;
  taken: boolean | null;
};

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseCoins(user: UserRow) {
  return Math.max(0, Math.floor(toNumber(user.px_coins, 0)));
}

function parseGems(user: UserRow) {
  const gems = user.px_gems ?? {};
  return {
    blue: Math.max(0, Math.floor(toNumber(gems.blue, 0))),
    purple: Math.max(0, Math.floor(toNumber(gems.purple, 0))),
    gold: Math.max(0, Math.floor(toNumber(gems.gold, 0)))
  };
}

export async function GET() {
  const { error, supabase, user } = await requireApiUser();
  if (error || !user) return error;

  const role = await getUserRole(supabase, user.id);
  if (!canAccessAdmin(user.email, role) || !isPrimaryAdminEmail(user.email)) {
    await auditAdminAccess({
      userId: user.id,
      eventName: "admin_api_live_denied",
      path: "/api/admin/live/overview",
      ok: false
    });
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (isAdminOtpRequired() && cookies().get(ADMIN_OTP_COOKIE)?.value !== "1") {
    return NextResponse.json({ error: "Admin OTP verification required." }, { status: 401 });
  }

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

  if (usersResult.error) {
    return NextResponse.json({ error: usersResult.error.message || "Failed to load users." }, { status: 500 });
  }

  const users = (usersResult.data ?? []) as UserRow[];
  const userIds = users.map((u) => u.id);

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

  const sessions = (sessionsResult.data ?? []) as SessionRow[];
  const postureRecords = (recordsResult.data ?? []) as PostureRecordRow[];
  const breaksToday = (breaksResult.data ?? []) as BreakRow[];

  const latestSessionByUser = new Map<string, SessionRow>();
  for (const row of sessions) {
    if (!latestSessionByUser.has(row.user_id)) {
      latestSessionByUser.set(row.user_id, row);
    }
  }

  const latestRecordByUser = new Map<string, PostureRecordRow>();
  for (const row of postureRecords) {
    if (!latestRecordByUser.has(row.user_id)) {
      latestRecordByUser.set(row.user_id, row);
    }
  }

  const activeSessions = sessions.filter((s) => !s.ended_at);
  const activeByUser = new Map<string, SessionRow[]>();
  for (const s of activeSessions) {
    const list = activeByUser.get(s.user_id) ?? [];
    list.push(s);
    activeByUser.set(s.user_id, list);
  }

  const breaksByUser = new Map<string, number>();
  const breaksTakenByUser = new Map<string, number>();
  for (const br of breaksToday) {
    breaksByUser.set(br.user_id, (breaksByUser.get(br.user_id) ?? 0) + 1);
    if (br.taken) {
      breaksTakenByUser.set(br.user_id, (breaksTakenByUser.get(br.user_id) ?? 0) + 1);
    }
  }

  const usersWithDetails = users.map((u) => {
    const lastSession = latestSessionByUser.get(u.id) ?? null;
    const lastRecord = latestRecordByUser.get(u.id) ?? null;
    const activeList = activeByUser.get(u.id) ?? [];
    const gems = parseGems(u);
    const sessionScore = lastSession
      ? Math.round((toNumber(lastSession.avg_alignment) + toNumber(lastSession.avg_stability) + toNumber(lastSession.avg_symmetry)) / 3)
      : 0;

    return {
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: String(u.role ?? "USER").toUpperCase(),
      plan_tier: String(u.plan_tier ?? "FREE").toUpperCase(),
      created_at: u.created_at,
      updated_at: u.updated_at,
      wallet: {
        coins: parseCoins(u),
        gems
      },
      sessions: {
        total_known: sessions.filter((s) => s.user_id === u.id).length,
        active: activeList.length,
        latest: lastSession
          ? {
              id: lastSession.id,
              started_at: lastSession.started_at,
              ended_at: lastSession.ended_at,
              duration_seconds: toNumber(lastSession.duration_seconds),
              peak_risk: String(lastSession.peak_risk ?? "LOW"),
              alert_count: toNumber(lastSession.alert_count),
              source: (lastSession.source ?? "camera") as "camera" | "sensor",
              score: sessionScore
            }
          : null
      },
      posture_live: lastRecord
        ? {
            captured_at: lastRecord.captured_at,
            score: toNumber(lastRecord.score),
            alignment: toNumber(lastRecord.alignment),
            symmetry: toNumber(lastRecord.symmetry),
            stability: toNumber(lastRecord.stability),
            risk_level: String(lastRecord.risk_level ?? "LOW"),
            source: (lastRecord.source ?? "camera") as "camera" | "sensor"
          }
        : null,
      breaks_today: {
        total: breaksByUser.get(u.id) ?? 0,
        taken: breaksTakenByUser.get(u.id) ?? 0
      }
    };
  });

  const summary = {
    users_total: users.length,
    sessions_total_loaded: sessions.length,
    sessions_active: activeSessions.length,
    records_total_loaded: postureRecords.length,
    average_live_score:
      usersWithDetails.length > 0
        ? Math.round(
            usersWithDetails.reduce((sum, item) => sum + (item.posture_live?.score ?? item.sessions.latest?.score ?? 0), 0) /
              usersWithDetails.length
          )
        : 0
  };

  await auditAdminAccess({
    userId: user.id,
    eventName: "admin_api_live_access",
    path: "/api/admin/live/overview",
    ok: true
  });

  return NextResponse.json({
    admin: { email: user.email ?? null },
    generated_at: new Date().toISOString(),
    summary,
    users: usersWithDetails
  });
}
