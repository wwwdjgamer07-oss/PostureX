import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!auth || auth !== `Bearer ${secret}`) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  console.log("Cron executed at:", new Date().toISOString());

  return NextResponse.json({
    ok: true,
    message: "Cron success",
    time: new Date().toISOString(),
  });
}
