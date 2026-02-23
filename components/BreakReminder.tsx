"use client";

import { PauseCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BreakRecommendation } from "@/lib/breakLogic";

interface BreakReminderProps {
  active: boolean;
  recommendation: BreakRecommendation | null;
  countdownSeconds: number | null;
  onStartBreak: () => void;
  onSnooze: () => void;
}

function formatCountdown(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function BreakReminder({
  active,
  recommendation,
  countdownSeconds,
  onStartBreak,
  onSnooze
}: BreakReminderProps) {
  const title = countdownSeconds !== null ? "Break in progress" : "Time for a break";
  const subtitle =
    countdownSeconds !== null
      ? "Stand, stretch, or walk"
      : recommendation?.reason === "fatigue_high"
        ? "Walk briefly. High fatigue detected."
        : recommendation?.reason === "declining_score"
          ? "Take a 2-minute stretch to recover score trend."
          : "Time to stand up and reset posture.";

  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-3 left-1/2 z-20 w-[min(92%,440px)] -translate-x-1/2 rounded-2xl border p-4 backdrop-blur-xl transition-all duration-300",
        recommendation?.urgency === "urgent"
          ? "border-red-300/55 bg-rose-950/75 shadow-[0_0_34px_rgba(251,113,133,0.35)]"
          : "border-cyan-300/45 bg-slate-950/78 shadow-[0_0_34px_rgba(56,189,248,0.3)]",
        active || countdownSeconds !== null ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "rounded-xl border p-2",
            recommendation?.urgency === "urgent"
              ? "border-red-300/40 bg-rose-500/20 text-rose-200"
              : "border-cyan-300/35 bg-blue-500/15 text-cyan-200"
          )}
        >
          <PauseCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-xs text-slate-300">{subtitle}</p>
          {countdownSeconds === null && recommendation?.message ? (
            <p className="mt-1 text-xs text-cyan-200">{recommendation.message}</p>
          ) : null}
          {countdownSeconds !== null ? (
            <p className="mt-2 text-lg font-semibold tracking-wide text-cyan-200">{formatCountdown(countdownSeconds)}</p>
          ) : null}
        </div>
      </div>

      {countdownSeconds === null ? (
        <div className="pointer-events-auto mt-3 flex gap-2">
          <button
            type="button"
            onClick={onStartBreak}
            className="flex-1 rounded-xl border border-cyan-300/45 bg-blue-500/25 px-3 py-2 text-xs font-medium text-cyan-100 transition hover:bg-blue-500/35"
          >
            Start Break
          </button>
          <button
            type="button"
            onClick={onSnooze}
            className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-slate-100 transition hover:bg-white/20"
          >
            Snooze 5 min
          </button>
        </div>
      ) : null}
    </div>
  );
}
