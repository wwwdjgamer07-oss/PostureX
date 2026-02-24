"use client";

import { useState } from "react";
import { classifyRisk, riskLabelDetail, calculateAdjustedScore } from "@/lib/riskEngine";
import { RISK_COLORS } from "@/lib/constants";
import { NotificationTriggerExample } from "@/components/NotificationTriggerExample";

export default function RiskDebugger() {
  const [score, setScore] = useState<number>(90);
  const [fatigue, setFatigue] = useState<number>(10);

  const risk = classifyRisk(score, fatigue);
  const explanation = riskLabelDetail(risk);
  const adjustedScore = calculateAdjustedScore(score, fatigue);
  const color = RISK_COLORS[risk];

  return (
    <div className="min-h-dvh bg-transparent p-8 font-sans text-slate-100">
      <div className="mx-auto max-w-2xl rounded-xl border border-cyan-300/20 bg-slate-900/80 p-6 shadow-lg backdrop-blur-xl">
        <h1 className="mb-6 border-b border-cyan-300/20 pb-4 text-3xl font-bold">Risk Engine Debugger</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Posture Score (0-100)</label>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-full rounded border border-cyan-300/25 bg-slate-900/80 p-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-full mt-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Fatigue Level (0-100)</label>
              <input
                type="number"
                value={fatigue}
                onChange={(e) => setFatigue(Number(e.target.value))}
                className="w-full rounded border border-cyan-300/25 bg-slate-900/80 p-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={fatigue}
                onChange={(e) => setFatigue(Number(e.target.value))}
                className="w-full mt-2"
              />
            </div>
          </div>

          {/* Results */}
          <div className="flex flex-col items-center justify-center rounded-lg border border-cyan-300/20 bg-slate-950/70 p-6 text-center">
            <h2 className="mb-2 text-sm uppercase tracking-wide text-slate-400">Calculated Risk</h2>
            <div
              className="text-4xl font-black mb-2"
              style={{ color: color }}
            >
              {risk}
            </div>
            <p className="text-sm text-slate-300">{explanation}</p>
            <div className="mt-4 text-xs text-slate-500">
              Adjusted Score: {adjustedScore.toFixed(2)}
            </div>
          </div>
        </div>
        <div className="mt-6 border-t border-cyan-300/20 pt-4">
          <p className="mb-3 text-xs uppercase tracking-[0.14em] text-cyan-200">Push Notification Trigger Example</p>
          <NotificationTriggerExample />
        </div>
      </div>
    </div>
  );
}
