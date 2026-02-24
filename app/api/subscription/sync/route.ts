import { requireApiUser } from "@/lib/api";
import { apiError, apiOk } from "@/lib/api/response";
import { syncSubscriptionExpiry } from "@/lib/subscriptionLifecycle";

export async function POST() {
  const { error, supabase, user } = await requireApiUser();
  if (error || !user) return error;

  try {
    const snapshot = await syncSubscriptionExpiry(supabase, user.id);
    return apiOk({ ok: true, snapshot });
  } catch (syncError) {
    return apiError(syncError instanceof Error ? syncError.message : "Failed to sync subscription.", 500, "SYNC_FAILED");
  }
}
