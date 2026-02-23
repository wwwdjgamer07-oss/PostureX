import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { deliverScheduledReports } from "@/lib/reports/service";

export const runtime = "nodejs";

function normalizeToken(value: string) {
  return value.trim().replace(/^"+|"+$/g, "");
}

function tokenFromAuthorizationHeader(authHeader: string | null) {
  if (!authHeader) return "";
  const parts = authHeader.trim().split(/\s+/);
  if (parts.length < 2) return "";
  if (parts[0]?.toLowerCase() !== "bearer") return "";
  return normalizeToken(parts.slice(1).join(" "));
}

export async function POST(req: NextRequest) {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  const bearerToken = tokenFromAuthorizationHeader(req.headers.get("authorization"));
  const cronHeaderToken = normalizeToken(req.headers.get("x-cron-secret") ?? "");
  const suppliedToken = bearerToken || cronHeaderToken;

  if (!secret || !suppliedToken || suppliedToken !== secret) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const startedAt = new Date().toISOString();
  console.log("Cron executed at:", startedAt);

  try {
    const supabase = createAdminSupabaseClient();
    const results = await deliverScheduledReports({ supabase });
    const sent = results.filter((item) => item.result.ok).length;
    const skipped = results.filter((item) => !item.result.ok && item.result.reason).length;
    const failed = results.filter((item) => !item.result.ok && !item.result.reason).length;

    return NextResponse.json({
      ok: true,
      message: "Cron success",
      time: startedAt,
      summary: {
        attempted: results.length,
        sent,
        skipped,
        failed
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scheduled reports failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
