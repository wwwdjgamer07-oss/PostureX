"use client";

import { useState } from "react";
import { classifyRisk, riskLabelDetail, calculateAdjustedScore } from "@/lib/riskEngine";
import { RISK_COLORS } from "@/lib/constants";

export default function RiskDebugger() {
  const [score, setScore] = useState<number>(90);
  const [fatigue, setFatigue] = useState<number>(10);

  const risk = classifyRisk(score, fatigue);
  const explanation = riskLabelDetail(risk);
  const adjustedScore = calculateAdjustedScore(score, fatigue);
  const color = RISK_COLORS[risk];

  return (
    <div className="min-h-screen p-8 bg-gray-50 text-gray-900 font-sans">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold mb-6 border-b pb-4">Risk Engine Debugger</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Posture Score (0-100)</label>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
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
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
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
          <div className="bg-gray-100 p-6 rounded-lg flex flex-col justify-center items-center text-center">
            <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-2">Calculated Risk</h2>
            <div
              className="text-4xl font-black mb-2"
              style={{ color: color }}
            >
              {risk}
            </div>
            <p className="text-sm text-gray-600">{explanation}</p>
            <div className="mt-4 text-xs text-gray-400">
              Adjusted Score: {adjustedScore.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
