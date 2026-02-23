"use client";

import { ShieldAlert } from "lucide-react";
import { classifyPostureRisk } from "@/lib/postureRisk";

interface PostureRiskCardProps {
  avgScore: number;
  fatigueTime: number;
  slouchEvents: number;
  headForwardEvents: number;
}

const badgeTone: Record<string, string> = {
  LOW: "border-emerald-300/45 bg-emerald-400/15 text-emerald-200 shadow-[0_0_28px_rgba(52,211,153,0.28)]",
  MODERATE: "border-yellow-300/45 bg-yellow-400/15 text-yellow-200 shadow-[0_0_28px_rgba(250,204,21,0.26)]",
  HIGH: "border-orange-300/45 bg-orange-400/15 text-orange-200 shadow-[0_0_28px_rgba(251,146,60,0.26)]",
  SEVERE: "border-rose-300/45 bg-rose-400/15 text-rose-200 shadow-[0_0_30px_rgba(244,63,94,0.3)]"
};

export function PostureRiskCard({ avgScore, fatigueTime, slouchEvents, headForwardEvents }: PostureRiskCardProps) {
  const risk = classifyPostureRisk({ avgScore, fatigueTime, slouchEvents, headForwardEvents });

  return (
    <article className="px-kpi px-reveal px-hover-lift" style={{ animationDelay: "220ms" }}>
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Posture Risk</p>
      <div className="mt-2 flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-cyan-300" />
        <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${badgeTone[risk.risk_level] ?? ""}`}>
          {risk.label}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">Avg score {Math.round(avgScore)} | Slouch {slouchEvents} | Head fwd {headForwardEvents}</p>
    </article>
  );
}
