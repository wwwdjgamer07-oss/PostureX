import { requireApiUser } from "@/lib/api";
import { apiError, apiOk } from "@/lib/api/response";
import { sendNotification } from "@/lib/pushServer";
import { notify } from "@/lib/notify";
import { z } from "zod";

const NotifySchema = z.object({
  type: z.enum(["bad_posture", "break_reminder", "session_complete", "daily_report", "reward_unlocked"]),
  title: z.string().trim().min(1).max(120).optional(),
  body: z.string().trim().min(1).max(240).optional(),
  icon: z.string().trim().optional(),
  url: z.string().trim().optional()
});

const defaults: Record<z.infer<typeof NotifySchema>["type"], { title: string; body: string; dbType: "posture" | "break" | "session" | "report" | "reward" }> = {
  bad_posture: { title: "Bad posture detected", body: "Straighten your back and reset your neck.", dbType: "posture" },
  break_reminder: { title: "Break reminder", body: "Take a short posture reset break.", dbType: "break" },
  session_complete: { title: "Session complete", body: "Your posture session summary is ready.", dbType: "session" },
  daily_report: { title: "Daily report ready", body: "Your daily posture analytics report is ready.", dbType: "report" },
  reward_unlocked: { title: "Reward unlocked", body: "You unlocked a new PostureX reward.", dbType: "reward" }
};

export async function POST(request: Request) {
  const { error, supabase, user } = await requireApiUser();
  if (error || !user) return error;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError("Invalid request body.", 400, "INVALID_BODY");
  }

  const parsed = NotifySchema.safeParse(payload);
  if (!parsed.success) {
    return apiError("Invalid payload.", 400, "INVALID_PAYLOAD", parsed.error.flatten());
  }
  const data = parsed.data;
  const d = defaults[data.type];
  const title = data.title ?? d.title;
  const body = data.body ?? d.body;
  const url = data.url && data.url.startsWith("/") ? data.url : "/dashboard";

  await notify(supabase, user.id, title, body, d.dbType);
  const icon = data.icon || "/icon.svg";
  await sendNotification(user.id, title, body, icon, url);

  return apiOk({ ok: true });
}
