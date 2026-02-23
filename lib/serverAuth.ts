import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getServerUser() {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    return user || null;
  } catch {
    return null;
  }
}

export async function getServerProfile(userId: string) {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("users")
    .select("id, full_name, role, plan_tier")
    .eq("id", userId)
    .maybeSingle();
  return data;
}
