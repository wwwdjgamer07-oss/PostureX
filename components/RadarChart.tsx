"use client";

import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";

interface RadarChartProps {
  alignment: number;
  symmetry: number;
  stability: number;
  fatigue: number;
}

export function RadarChart({ alignment, symmetry, stability, fatigue }: RadarChartProps) {
  const data = [
    { subject: "Alignment", value: alignment },
    { subject: "Symmetry", value: symmetry },
    { subject: "Stability", value: stability },
    { subject: "Endurance", value: 100 - fatigue },
  ];

  return (
    <div className="glass-card flex h-[350px] w-full flex-col p-6">
      <h3 className="mb-4 text-sm font-medium text-slate-300">Biometric Balance</h3>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="#1e293b" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
            />
            <Radar
              name="Posture"
              dataKey="value"
              stroke="#00E5FF"
              fill="#2962FF"
              fillOpacity={0.5}
            />
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}