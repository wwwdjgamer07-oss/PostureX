import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { deliverScheduledReports } from "@/lib/reports/service";
import { safeCompare } from "@/lib/security";
import { getCronSecret } from "@/lib/env";
import { apiError, apiOk } from "@/lib/api/response";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const expected = getCronSecret();
  if (!expected) return process.env.NODE_ENV !== "production";

  const bearer = request.headers.get("authorization") ?? "";
  const bearerToken = bearer.startsWith("Bearer ") ? bearer.slice(7) : "";
  if (bearerToken && safeCompare(bearerToken, expected)) return true;

  const header = request.headers.get("x-cron-secret") ?? "";
  return header.length === expected.length && safeCompare(header, expected);
}

async function runScheduled(request: Request) {
  if (!isAuthorized(request)) {
    return apiError("Unauthorized.", 401, "UNAUTHORIZED");
  }

  try {
    const admin = createAdminSupabaseClient();
    const results = await deliverScheduledReports({ supabase: admin });
    const sent = results.filter((item) => item.result.ok).length;
    const skipped = results.filter((item) => !item.result.ok && item.result.reason).length;
    const failed = results.filter((item) => !item.result.ok && !item.result.reason).length;

    return apiOk({
      success: true,
      summary: { attempted: results.length, sent, skipped, failed },
      results
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process scheduled reports.";
    return apiError(message, 500, "SCHEDULED_REPORTS_FAILED");
  }
}

export async function POST(request: Request) {
  return runScheduled(request);
}

export async function GET(request: Request) {
  return runScheduled(request);
}
