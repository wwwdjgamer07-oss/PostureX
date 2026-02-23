import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { normalizeRisk } from "@/lib/normalizeRisk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

interface SessionInsertPayload {
  avg_alignment: number;
  stability: number;
  symmetry: number;
  risk_level?: string | number | null;
  duration_seconds: number;
}

interface SessionResponseRow {
  id: string;
  avg_alignment: number;
  stability: number;
  symmetry: number;
  risk_level: string;
  duration_seconds: number;
  started_at: string;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeRiskLevel(value: string) {
  const normalized = value.trim().toUpperCase();
  if (normalized === "LOW" || normalized === "MODERATE" || normalized === "HIGH" || normalized === "SEVERE") {
    return normalized;
  }
  return "MODERATE";
}

function normalizeRiskForPeakRisk(value: string | number | null | undefined) {
  if (value === "MODERATE") return normalizeRisk("MEDIUM");
  if (value === "SEVERE" || value === "CRITICAL") return normalizeRisk("HIGH");
  return normalizeRisk(value);
}

type SessionInsertClient = SupabaseClient;

function isSessionsTableMissingError(message: string | null | undefined) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes("public.sessions") && normalized.includes("schema cache");
}

function createDbClientFromAccessToken(accessToken: string): SessionInsertClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  return createSupabaseClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}

function asNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asString(value: unknown, fallback: string) {
  if (typeof value === "string" && value.length > 0) return value;
  return fallback;
}

function toResponseRow(
  row: Record<string, unknown> | null,
  fallback: Omit<SessionInsertPayload, "risk_level"> & { risk_level: string; id: string; started_at: string }
): SessionResponseRow {
  const source = row ?? {};
  const riskLevel = source.peak_risk ?? source.risk_level ?? fallback.risk_level;
  return {
    id: asString(source.id, fallback.id),
    avg_alignment: asNumber(source.avg_alignment, fallback.avg_alignment),
    stability: asNumber(source.avg_stability ?? source.stability, fallback.stability),
    symmetry: asNumber(source.avg_symmetry ?? source.symmetry, fallback.symmetry),
    risk_level: asString(riskLevel, fallback.risk_level),
    duration_seconds: asNumber(source.duration_seconds, fallback.duration_seconds),
    started_at: asString(source.started_at, fallback.started_at)
  };
}

async function insertSession(
  client: SessionInsertClient,
  userId: string,
  body: SessionInsertPayload
): Promise<{ data: SessionResponseRow | null; error: { message: string } | null }> {
  const startedAt = new Date().toISOString();
  const normalizedRisk = normalizeRiskLevel(typeof body.risk_level === "string" ? body.risk_level : "MODERATE");
  const normalizedPeakRisk = normalizeRiskForPeakRisk(body.risk_level);
  const durationSeconds = Math.max(0, Math.round(body.duration_seconds));

  // Step 1: Insert minimal row using common columns that exist in both schemas.
  const generatedId = crypto.randomUUID();
  const insertWithId = await client
    .from("sessions")
    .insert({
      id: generatedId,
      user_id: userId,
      started_at: startedAt,
      duration_seconds: durationSeconds
    })
    .select("*")
    .single();

  let sessionRow: Record<string, unknown> | null = null;
  let sessionId = generatedId;
  let lastErrorMessage = "";

  if (!insertWithId.error) {
    sessionRow = (insertWithId.data as Record<string, unknown> | null) ?? null;
    sessionId = asString(sessionRow?.id, generatedId);
  } else {
    lastErrorMessage = insertWithId.error.message;
    const insertWithoutId = await client
      .from("sessions")
      .insert({
        user_id: userId,
        started_at: startedAt,
        duration_seconds: durationSeconds
      })
      .select("*")
      .single();

    if (insertWithoutId.error) {
      return {
        data: null,
        error: { message: insertWithoutId.error.message || lastErrorMessage || "Session insert failed." }
      };
    }

    sessionRow = (insertWithoutId.data as Record<string, unknown> | null) ?? null;
    sessionId = asString(sessionRow?.id, generatedId);
  }

  // Step 2: Try schema-specific metric updates. If update fails, keep base session saved.
  const legacyUpdate = await client
    .from("sessions")
    .update({
      avg_alignment: body.avg_alignment,
      avg_stability: body.stability,
      avg_symmetry: body.symmetry,
      peak_risk: normalizedPeakRisk,
      duration_seconds: durationSeconds
    })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (!legacyUpdate.error && legacyUpdate.data) {
    sessionRow = legacyUpdate.data as Record<string, unknown>;
  } else {
    const modernUpdate = await client
      .from("sessions")
      .update({
        avg_alignment: body.avg_alignment,
        stability: body.stability,
        symmetry: body.symmetry,
        risk_level: normalizedRisk,
        duration_seconds: durationSeconds
      })
      .eq("id", sessionId)
      .eq("user_id", userId)
      .select("*")
      .maybeSingle();

    if (!modernUpdate.error && modernUpdate.data) {
      sessionRow = modernUpdate.data as Record<string, unknown>;
    } else {
      lastErrorMessage = modernUpdate.error?.message || legacyUpdate.error?.message || "";
      if (lastErrorMessage) {
        console.error("Analytics metrics update warning:", lastErrorMessage);
      }
    }
  }

  const fallbackRow = {
    id: sessionId,
    avg_alignment: body.avg_alignment,
    stability: body.stability,
    symmetry: body.symmetry,
    risk_level: normalizedRisk,
    duration_seconds: durationSeconds,
    started_at: startedAt
  };

  const mapped = toResponseRow(sessionRow ?? fallbackRow, fallbackRow);
  return { data: mapped, error: null };
}

async function ensureUserProfileRow(
  client: SessionInsertClient,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }
) {
  const fullNameRaw = user.user_metadata?.full_name;
  const fullName = typeof fullNameRaw === "string" ? fullNameRaw : null;
  const email = user.email ?? `${user.id}@local.invalid`;

  const result = await client
    .from("users")
    .upsert(
      {
        id: user.id,
        email,
        full_name: fullName
      },
      { onConflict: "id" }
    );

  return result.error;
}

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("sessions")
    .select("id, avg_alignment, avg_stability, avg_symmetry, peak_risk, duration_seconds, started_at")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(100);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sessions: SessionResponseRow[] = (data ?? []).map((row) =>
    toResponseRow(
      row as Record<string, unknown>,
      {
        id: crypto.randomUUID(),
        avg_alignment: 0,
        stability: 0,
        symmetry: 0,
        risk_level: "LOW",
        duration_seconds: 0,
        started_at: new Date().toISOString()
      }
    )
  );

  return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
  const userScopedClient = createServerSupabaseClient();
  const {
    data: { user }
  } = await userScopedClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SessionInsertPayload;
  try {
    body = (await request.json()) as SessionInsertPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (
    !isFiniteNumber(body.avg_alignment) ||
    !isFiniteNumber(body.stability) ||
    !isFiniteNumber(body.symmetry) ||
    !isFiniteNumber(body.duration_seconds)
  ) {
    return NextResponse.json({ error: "Invalid analytics payload." }, { status: 400 });
  }

  const {
    data: { session }
  } = await userScopedClient.auth.getSession();

  // Force a DB client with explicit bearer token so RLS sees auth.uid() correctly.
  const tokenClient =
    session?.access_token ? createDbClientFromAccessToken(session.access_token) : null;
  const primaryClient = tokenClient ?? userScopedClient;

  // Best effort: ensure profile row exists for schemas with sessions.user_id -> public.users FK.
  const userRowError = await ensureUserProfileRow(primaryClient, {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata
  });
  if (userRowError) {
    console.error("Users upsert warning (user-scoped):", userRowError.message);
  }

  const primaryInsert = await insertSession(primaryClient, user.id, body);
  if (primaryInsert.data) {
    return NextResponse.json({ session: primaryInsert.data }, { status: 201 });
  }

  let fallbackErrorMessage = primaryInsert.error?.message ?? "Failed to save analytics session.";

  if (isSessionsTableMissingError(fallbackErrorMessage)) {
    return NextResponse.json(
      {
        error:
          "Database table 'public.sessions' is missing in the connected Supabase project. Run the project migrations (or create the table) and retry."
      },
      { status: 500 }
    );
  }

  // Optional fallback: if RLS blocks inserts, use service role when available.
  const hasAdminFallbackEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (hasAdminFallbackEnv) {
    try {
      const adminClient = createAdminSupabaseClient();
      const adminUserRowError = await ensureUserProfileRow(adminClient as SessionInsertClient, {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      });
      if (adminUserRowError) {
        console.error("Users upsert warning (admin):", adminUserRowError.message);
      }
      const adminInsert = await insertSession(adminClient as SessionInsertClient, user.id, body);
      if (adminInsert.data) {
        return NextResponse.json({ session: adminInsert.data }, { status: 201 });
      }
      fallbackErrorMessage = adminInsert.error?.message ?? fallbackErrorMessage;
    } catch (adminError) {
      if (adminError instanceof Error && adminError.message) {
        fallbackErrorMessage = `${fallbackErrorMessage} (Admin fallback failed: ${adminError.message})`;
      }
    }
  }

  console.error("Analytics insert failed:", fallbackErrorMessage);
  return NextResponse.json({ error: fallbackErrorMessage }, { status: 500 });
}
