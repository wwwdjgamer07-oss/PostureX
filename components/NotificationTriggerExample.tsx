"use client";

import { sendNotification } from "@/lib/pushClient";

const examples: Array<{ type: Parameters<typeof sendNotification>[4]; title: string; body: string }> = [
  { type: "bad_posture", title: "Bad posture detected", body: "Keep your spine aligned." },
  { type: "break_reminder", title: "Break reminder", body: "Time for a short recovery break." },
  { type: "session_complete", title: "Session complete", body: "Your session summary is ready." },
  { type: "daily_report", title: "Daily report ready", body: "Open dashboard to review your report." },
  { type: "reward_unlocked", title: "Reward unlocked", body: "You unlocked a new PostureX reward." }
];

export function NotificationTriggerExample() {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {examples.map((item) => (
        <button
          key={item.type}
          type="button"
          onClick={() => {
            void sendNotification(item.title, item.body, "/icon.svg", "/dashboard", item.type);
          }}
          className="rounded-lg border border-cyan-300/40 bg-cyan-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-100"
        >
          {item.title}
        </button>
      ))}
    </div>
  );
}
