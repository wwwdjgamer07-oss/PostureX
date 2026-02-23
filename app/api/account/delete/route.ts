import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function DELETE() {
  const { error, user } = await requireApiUser();
  if (error || !user) return error;

  const admin = createAdminSupabaseClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
