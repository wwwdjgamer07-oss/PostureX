import { requireApiUser } from "@/lib/api";
import { apiError, apiOk } from "@/lib/api/response";

interface PushSubscriptionRequest {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

export async function POST(request: Request) {
  const { error, supabase, user } = await requireApiUser();
  if (error || !user) return error;

  let payload: PushSubscriptionRequest;
  try {
    payload = (await request.json()) as PushSubscriptionRequest;
  } catch {
    return apiError("Invalid request body.", 400, "INVALID_BODY");
  }

  const endpoint = String(payload.endpoint ?? "").trim();
  const p256dh = String(payload.keys?.p256dh ?? "").trim();
  const auth = String(payload.keys?.auth ?? "").trim();
  if (!endpoint || !p256dh || !auth) {
    return apiError("Subscription payload is incomplete.", 400, "INVALID_SUBSCRIPTION");
  }

  const { error: upsertError } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth
    },
    { onConflict: "endpoint" }
  );

  if (upsertError) {
    return apiError(upsertError.message || "Failed to save push subscription.", 500, "UPSERT_FAILED");
  }

  return apiOk({ ok: true });
}
