"use client";

import { cn } from "@/lib/utils";
import type { PostureCoachingFeedback } from "@/lib/postureCoaching";

interface CoachingBubbleProps {
  feedback: PostureCoachingFeedback;
  tips?: string[];
}

const toneStyles = {
  good: "border-emerald-300/45 bg-emerald-500/10 shadow-[0_0_28px_rgba(16,185,129,0.28)]",
  warning: "border-amber-300/45 bg-amber-500/10 shadow-[0_0_28px_rgba(245,158,11,0.28)]",
  bad: "border-rose-300/45 bg-rose-500/10 shadow-[0_0_30px_rgba(244,63,94,0.3)]"
} as const;

const textTones = {
  good: "text-emerald-100",
  warning: "text-amber-100",
  bad: "text-rose-100"
} as const;

export function CoachingBubble({ feedback, tips = [] }: CoachingBubbleProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-3 right-3 z-20 w-[min(88%,300px)] rounded-xl border p-3 backdrop-blur-xl",
        toneStyles[feedback.severity]
      )}
      role="status"
      aria-live="polite"
    >
      <p className={cn("text-sm font-semibold", textTones[feedback.severity])}>{feedback.message}</p>
      <p className="mt-1 text-xs text-slate-200/95">{feedback.suggestion}</p>
      {tips.length > 0 ? (
        <div className="mt-2">
          <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-100/90">Fix now</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {tips.slice(0, 3).map((tip) => (
              <span
                key={tip}
                className="inline-flex items-center rounded-full border border-cyan-300/40 bg-cyan-400/12 px-2 py-1 text-[11px] leading-none text-cyan-50"
              >
                • {tip}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
