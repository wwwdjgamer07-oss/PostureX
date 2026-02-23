"use client";

import { cn } from "@/lib/utils";

interface EmotionIndicatorProps {
  emotion: string;
}

const toneMap: Record<string, string> = {
  frustration: "border-amber-300/35 text-amber-200 bg-amber-300/10",
  fatigue: "border-blue-300/35 text-blue-200 bg-blue-300/10",
  confidence: "border-cyan-300/35 text-cyan-100 bg-cyan-300/10",
  stress: "border-indigo-300/35 text-indigo-200 bg-indigo-300/10",
  discouragement: "border-orange-300/35 text-orange-200 bg-orange-300/10",
  achievement: "border-emerald-300/35 text-emerald-200 bg-emerald-300/10",
  neutral: "border-slate-400/35 text-slate-200 bg-slate-300/10"
};

export function EmotionIndicator({ emotion }: EmotionIndicatorProps) {
  const key = emotion.toLowerCase();
  return (
    <span className={cn("rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.14em]", toneMap[key] ?? toneMap.neutral)}>
      {key}
    </span>
  );
}

