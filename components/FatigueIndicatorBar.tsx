"use client";

import type { FatigueState } from "@/lib/fatigueDetection";

interface FatigueIndicatorBarProps {
  fatigue: FatigueState;
}

const tone = {
  none: {
    text: "text-emerald-200",
    bar: "from-emerald-400 to-cyan-300",
    border: "border-emerald-300/30"
  },
  low: {
    text: "text-amber-200",
    bar: "from-lime-300 to-amber-300",
    border: "border-amber-300/30"
  },
  medium: {
    text: "text-amber-100",
    bar: "from-amber-300 to-orange-400",
    border: "border-orange-300/35"
  },
  high: {
    text: "text-rose-100",
    bar: "from-orange-400 to-rose-500",
    border: "border-rose-300/40"
  }
} as const;

const progress = {
  none: 18,
  low: 45,
  medium: 72,
  high: 95
} as const;

function durationLabel(seconds: number) {
  if (!seconds) return "tracking";
  const min = Math.floor(seconds / 60);
  return `${min} min window`;
}

export function FatigueIndicatorBar({ fatigue }: FatigueIndicatorBarProps) {
  const style = tone[fatigue.fatigue_level];

  return (
    <article className={`px-panel px-reveal p-5 ${style.border}`} style={{ animationDelay: "420ms" }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Fatigue Indicator</p>
        <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${style.text}`}>{fatigue.fatigue_level}</p>
      </div>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-900/70">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${style.bar} shadow-[0_0_16px_rgba(34,211,238,0.25)] transition-all duration-500`}
          style={{ width: `${progress[fatigue.fatigue_level]}%` }}
        />
      </div>

      <p className={`mt-3 text-sm font-medium ${style.text}`}>{fatigue.fatigue_level === "none" ? "Stable posture" : "You look fatigued"}</p>
      <p className="mt-1 text-xs text-slate-400">
        Avg score: {Math.round(fatigue.avg_score)} | {durationLabel(fatigue.duration)}
      </p>
    </article>
  );
}

