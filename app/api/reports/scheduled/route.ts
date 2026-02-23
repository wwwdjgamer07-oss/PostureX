import { NextRequest, NextResponse } from "next/server";

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

  console.log("Cron executed at:", new Date().toISOString());

  return NextResponse.json({
    ok: true,
    message: "Cron success",
    time: new Date().toISOString(),
  });
}
