import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireApiUser } from "@/lib/api";
import {
  ADMIN_OTP_COOKIE,
  auditAdminAccess,
  canAccessAdmin,
  getUserRole,
  resolveExpectedAdminOtp
} from "@/lib/adminGuard";

export async function POST(request: Request) {
  const { error, supabase, user } = await requireApiUser();
  if (error || !user) return error;

  const role = await getUserRole(supabase, user.id);
  const allowed = canAccessAdmin(user.email, role);
  if (!allowed) {
    await auditAdminAccess({
      userId: user.id,
      eventName: "admin_otp_forbidden",
      path: "/api/admin/verify-otp",
      ok: false
    });
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let code = "";
  try {
    const body = (await request.json()) as { code?: unknown };
    code = String(body.code ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const expected = resolveExpectedAdminOtp();
  if (code !== expected) {
    await auditAdminAccess({
      userId: user.id,
      eventName: "admin_otp_failed",
      path: "/api/admin/verify-otp",
      ok: false
    });
    return NextResponse.json({ error: "Invalid OTP code." }, { status: 401 });
  }

  cookies().set({
    name: ADMIN_OTP_COOKIE,
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });

  await auditAdminAccess({
    userId: user.id,
    eventName: "admin_otp_success",
    path: "/api/admin/verify-otp",
    ok: true
  });

  return NextResponse.json({ ok: true });
}

