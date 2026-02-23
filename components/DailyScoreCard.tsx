"use client";

import { Activity } from "lucide-react";

interface DailyScoreCardProps {
  score: number;
  sessions: number;
  totalDurationSeconds: number;
}

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function DailyScoreCard({ score, sessions, totalDurationSeconds }: DailyScoreCardProps) {
  return (
    <article className="px-panel px-reveal p-6" style={{ animationDelay: "130ms" }}>
      <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Daily Score</p>
      <div className="mt-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/35 bg-cyan-400/12 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.25)]">
          <Activity className="h-5 w-5" />
        </div>
        <p className="text-4xl font-semibold text-cyan-100">{Math.round(score)}</p>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-500/25 bg-slate-900/55 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Sessions</p>
          <p className="mt-1 text-lg font-semibold text-white">{sessions}</p>
        </div>
        <div className="rounded-xl border border-slate-500/25 bg-slate-900/55 px-3 py-2">
          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Time Today</p>
          <p className="mt-1 text-lg font-semibold text-white">{formatDuration(totalDurationSeconds)}</p>
        </div>
      </div>
    </article>
  );
}

