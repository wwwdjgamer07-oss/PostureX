import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationType } from "@/lib/types";

export async function notify(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  message: string,
  type: NotificationType = "info"
) {
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type
  });

  if (error) {
    throw new Error(error.message || "Failed to create notification.");
  }
}
