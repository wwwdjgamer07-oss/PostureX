export async function sendNotification(
  title: string,
  body: string,
  icon = "/icon.svg",
  url = "/dashboard",
  type: "bad_posture" | "break_reminder" | "session_complete" | "daily_report" | "reward_unlocked" = "session_complete"
) {
  await fetch("/api/push/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      type,
      title,
      body,
      icon,
      url
    })
  });
}
