"use client";

import { useMemo } from "react";

interface DevicePostureGaugeProps {
  pitch: number;
  roll: number;
  stability: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function DevicePostureGauge({ pitch, roll, stability }: DevicePostureGaugeProps) {
  const { x, y, ringOpacity } = useMemo(() => {
    const nx = clamp(roll / 35, -1, 1);
    const ny = clamp(pitch / 35, -1, 1);
    return {
      x: 72 + nx * 52,
      y: 72 + ny * 52,
      ringOpacity: clamp(stability / 100, 0.15, 1)
    };
  }, [pitch, roll, stability]);

  return (
    <article className="px-panel px-reveal px-hover-lift p-5" style={{ animationDelay: "420ms" }}>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">Device Tilt</p>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Upright zone and live sensor angle.</p>
      <div className="mt-4 flex justify-center">
        <svg viewBox="0 0 144 144" className="h-44 w-44">
          <circle cx="72" cy="72" r="62" fill="rgba(15,23,42,0.78)" stroke="rgba(34,211,238,0.25)" strokeWidth="1.5" />
          <circle cx="72" cy="72" r="24" fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.55)" strokeWidth="1.5" />
          <circle
            cx="72"
            cy="72"
            r="54"
            fill="none"
            stroke="rgba(34,211,238,0.75)"
            strokeOpacity={ringOpacity}
            strokeWidth="4"
            strokeDasharray="6 6"
          />
          <line x1="72" y1="10" x2="72" y2="134" stroke="rgba(148,163,184,0.35)" strokeWidth="1" />
          <line x1="10" y1="72" x2="134" y2="72" stroke="rgba(148,163,184,0.35)" strokeWidth="1" />
          <circle cx={x} cy={y} r="6" fill="rgb(34,211,238)" />
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-400">
        <p>Pitch: {Math.round(pitch)}°</p>
        <p>Roll: {Math.round(roll)}°</p>
        <p>Stability: {Math.round(stability)}%</p>
      </div>
    </article>
  );
}

