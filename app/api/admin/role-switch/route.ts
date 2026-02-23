import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";
import { isPrimaryAdminEmail } from "@/lib/adminAccess";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  auditAdminAccess
} from "@/lib/adminGuard";

type AllowedRole = "USER" | "ADMIN";

function isAllowedRole(value: unknown): value is AllowedRole {
  return value === "USER" || value === "ADMIN";
}

export async function POST(request: Request) {
  const { error, user } = await requireApiUser();
  if (error || !user) return error;

  if (!isPrimaryAdminEmail(user.email)) {
    await auditAdminAccess({
      userId: user.id,
      eventName: "admin_role_switch_denied",
      path: "/api/admin/role-switch",
      ok: false
    });
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let nextRole: AllowedRole;
  try {
    const body = (await request.json()) as { role?: unknown };
    const role = String(body.role ?? "").toUpperCase();
    if (!isAllowedRole(role)) {
      return NextResponse.json({ error: "Invalid role. Use USER or ADMIN." }, { status: 400 });
    }
    nextRole = role;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: updatedRow, error: updateError } = await admin
    .from("users")
    .update({ role: nextRole })
    .eq("id", user.id)
    .select("id, role")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message || "Failed to update role." }, { status: 500 });
  }

  let persistedRole = updatedRow?.role ? String(updatedRow.role).toUpperCase() : "";
  if (!persistedRole) {
    const fallbackEmail = String(user.email ?? "").trim() || `${user.id}@local.invalid`;
    const { data: upsertedRow, error: upsertError } = await admin
      .from("users")
      .upsert(
        {
          id: user.id,
          email: fallbackEmail,
          role: nextRole
        },
        { onConflict: "id" }
      )
      .select("id, role")
      .maybeSingle();

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message || "Failed to persist role." }, { status: 500 });
    }

    persistedRole = upsertedRow?.role ? String(upsertedRow.role).toUpperCase() : "";
  }

  if (!isAllowedRole(persistedRole)) {
    return NextResponse.json({ error: "Role was not persisted." }, { status: 500 });
  }

  await auditAdminAccess({
    userId: user.id,
    eventName: "admin_role_switch_success",
    path: "/api/admin/role-switch",
    ok: true,
    detail: { role: persistedRole }
  });

  return NextResponse.json({ ok: true, role: persistedRole });
}
