"use client";

import { useEffect, useRef } from "react";

interface Props {
  width: number;
  height: number;
  landmarks: { x: number; y: number; z: number; visibility?: number }[] | null;
}

export function LandmarkOverlay({ width, height, landmarks }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    if (!landmarks || landmarks.length === 0) return;

    // Style for the "Cyber" look
    ctx.strokeStyle = "#00E5FF";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#00E5FF";

    // Draw connections (Shoulders and Hips)
    const connections = [[11, 12], [11, 23], [12, 24], [23, 24]];
    
    connections.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      if (p1.visibility! > 0.5 && p2.visibility! > 0.5) {
        ctx.beginPath();
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
        ctx.stroke();
      }
    });

    // Draw points
    ctx.fillStyle = "#2962FF";
    landmarks.forEach((p, i) => {
      if (p.visibility! > 0.5 && [0, 11, 12, 23, 24].includes(i)) {
        ctx.beginPath();
        ctx.arc(p.x * width, p.y * height, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    });
  }, [landmarks, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} className="absolute inset-0 pointer-events-none" />;
}