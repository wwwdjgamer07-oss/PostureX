import { createClient } from "@/lib/supabase/client";

export async function createProfile(userId: string, fullName: string) {
  const supabase = createClient();
  return await supabase
    .from("users")
    .insert([
      { 
        id: userId, 
        full_name: fullName,
        updated_at: new Date().toISOString()
      }
    ])
    .select()
    .single();
}

export async function getProfile(userId: string) {
  const supabase = createClient();
  return await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
}

export async function updateProfile(userId: string, updates: Record<string, unknown>) {
  const supabase = createClient();
  return await supabase
    .from("users")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();
}
