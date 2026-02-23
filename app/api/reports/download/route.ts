import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { buildPostureReportMetrics } from "@/lib/reports/data";
import { generatePosturePDF } from "@/lib/reports/generatePosturePDF";
import { resolveReportRange } from "@/lib/reports/range";
import { getUserPlanTierForClient } from "@/lib/planAccess";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { error, supabase, user } = await requireApiUser();
  if (error || !user) return error;

  const planTier = await getUserPlanTierForClient(supabase, user.id, user.email);
  if (planTier === "FREE") {
    return NextResponse.json({ error: "PDF report download is available on BASIC and PRO plans." }, { status: 403 });
  }

  const url = new URL(request.url);
  const periodParam = String(url.searchParams.get("period") ?? "weekly").toLowerCase();
  const period = periodParam === "daily" ? "daily" : "weekly";
  const range = resolveReportRange(period);

  const admin = createAdminSupabaseClient();
  const metrics = await buildPostureReportMetrics({
    supabase: admin,
    userId: user.id,
    period,
    range
  });
  const buffer = await generatePosturePDF(metrics);
  const filename = `PostureX_${period}_report_${range.start}_to_${range.end}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
