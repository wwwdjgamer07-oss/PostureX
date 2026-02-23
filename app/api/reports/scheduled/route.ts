import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const expected = process.env.CRON_SECRET ?? "";

  if (!token || !expected || token !== expected) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const executedAt = new Date().toISOString();
  console.log(`[cron] /api/reports/scheduled executed at ${executedAt}`);

  return NextResponse.json({
    success: true,
    message: "Scheduled reports job executed.",
    executedAt
  });
}
