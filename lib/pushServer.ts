import webpush, { PushSubscription } from "web-push";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

let configured = false;

function ensureWebPushConfigured() {
  if (configured) return;
  const subject = process.env.WEB_PUSH_SUBJECT || "mailto:support@posturex.app";
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error("Missing web push VAPID keys.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export function buildPushPayload(title: string, body: string, icon = "/icon.svg", url = "/dashboard") {
  return JSON.stringify({
    title,
    body,
    icon,
    silent: true,
    data: { url }
  });
}

export async function sendNotification(userId: string, title: string, body: string, icon = "/icon.svg", url = "/dashboard") {
  ensureWebPushConfigured();
  const admin = createAdminSupabaseClient();
  const { data: rows } = await admin
    .from("push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("user_id", userId);

  const subscriptions = (rows ?? []) as Array<{ endpoint: string; p256dh: string; auth: string }>;
  if (!subscriptions.length) return;
  const payload = buildPushPayload(title, body, icon, url);

  await Promise.all(
    subscriptions.map(async (row) => {
      const subscription: PushSubscription = {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth
        }
      };

      try {
        await webpush.sendNotification(subscription, payload);
      } catch (error) {
        const statusCode =
          error && typeof error === "object" && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
        }
      }
    })
  );
}
