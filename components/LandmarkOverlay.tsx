"use client";

import type { PoseLandmark } from "@/lib/postureEngine";

interface LandmarkOverlayProps {
  landmarks: PoseLandmark[];
}

const CONNECTIONS: Array<[number, number]> = [
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16]
];

export function LandmarkOverlay({ landmarks }: LandmarkOverlayProps) {
  if (landmarks.length === 0) {
    return null;
  }

  return (
    <svg className="absolute inset-0 h-full w-full">
      {CONNECTIONS.map(([from, to]) => {
        const start = landmarks[from];
        const end = landmarks[to];

        if (!start || !end) {
          return null;
        }

        return (
          <line
            key={`${from}-${to}`}
            x1={`${start.x * 100}%`}
            y1={`${start.y * 100}%`}
            x2={`${end.x * 100}%`}
            y2={`${end.y * 100}%`}
            stroke="rgba(56,189,248,0.85)"
            strokeWidth={2}
          />
        );
      })}
      {landmarks.map((point, index) => (
        <circle
          key={index}
          cx={`${point.x * 100}%`}
          cy={`${point.y * 100}%`}
          r={3}
          fill="rgba(125,211,252,0.95)"
        />
      ))}
    </svg>
  );
}
