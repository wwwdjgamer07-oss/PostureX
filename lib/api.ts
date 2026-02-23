import { createServerSupabaseClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api/response";

export async function requireApiUser() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: apiError("Unauthorized.", 401, "UNAUTHORIZED"),
      supabase,
      user: null
    };
  }

  return { error: null, supabase, user };
}
