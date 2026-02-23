import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { deliverScheduledReports } from "@/lib/reports/service";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;

  const bearer = request.headers.get("authorization");
  if (bearer === `Bearer ${expected}`) return true;

  const header = request.headers.get("x-cron-secret");
  return header === expected;
}

async function runScheduled(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const admin = createAdminSupabaseClient();
    const results = await deliverScheduledReports({ supabase: admin });
    const sent = results.filter((item) => item.result.ok).length;
    const skipped = results.filter((item) => !item.result.ok && item.result.reason).length;
    const failed = results.filter((item) => !item.result.ok && !item.result.reason).length;

    return NextResponse.json({
      success: true,
      summary: { attempted: results.length, sent, skipped, failed },
      results
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process scheduled reports.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return runScheduled(request);
}

export async function GET(request: Request) {
  return runScheduled(request);
}
