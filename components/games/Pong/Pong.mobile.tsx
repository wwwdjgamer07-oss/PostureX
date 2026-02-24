"use client";

import { useEffect, useRef, useState } from "react";

type PongMobileProps = {
  onExit?: () => void;
};

export default function PongMobile({ onExit }: PongMobileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const playerY = useRef(240);
  const aiY = useRef(240);
  const ball = useRef({ x: 180, y: 320, vx: 180, vy: 140 });
  const [score, setScore] = useState({ you: 0, ai: 0 });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dt = 1 / 60;
      const w = canvas.width;
      const h = canvas.height;
      const paddleH = Math.max(80, h * 0.15);
      const paddleW = 10;

      aiY.current += (ball.current.y - (aiY.current + paddleH / 2)) * 0.08;
      aiY.current = Math.max(0, Math.min(h - paddleH, aiY.current));
      playerY.current = Math.max(0, Math.min(h - paddleH, playerY.current));

      ball.current.x += ball.current.vx * dt;
      ball.current.y += ball.current.vy * dt;

      if (ball.current.y <= 8 || ball.current.y >= h - 8) {
        ball.current.vy *= -1;
      }

      if (
        ball.current.x <= 24 &&
        ball.current.y >= playerY.current &&
        ball.current.y <= playerY.current + paddleH
      ) {
        ball.current.vx = Math.abs(ball.current.vx);
      }

      if (
        ball.current.x >= w - 24 &&
        ball.current.y >= aiY.current &&
        ball.current.y <= aiY.current + paddleH
      ) {
        ball.current.vx = -Math.abs(ball.current.vx);
      }

      if (ball.current.x < 0) {
        setScore((s) => ({ ...s, ai: s.ai + 1 }));
        ball.current = { x: w / 2, y: h / 2, vx: 180, vy: 120 };
      } else if (ball.current.x > w) {
        setScore((s) => ({ ...s, you: s.you + 1 }));
        ball.current = { x: w / 2, y: h / 2, vx: -180, vy: -120 };
      }

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(34,211,238,0.22)";
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(14, playerY.current, paddleW, paddleH);
      ctx.fillRect(w - 24, aiY.current, paddleW, paddleH);

      ctx.beginPath();
      ctx.arc(ball.current.x, ball.current.y, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#a5f3fc";
      ctx.font = "600 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${score.you} : ${score.ai}`, w / 2, 28);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [score.ai, score.you]);

  const moveUp = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    playerY.current = Math.max(0, playerY.current - canvas.height * 0.1);
  };
  const moveDown = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    playerY.current = Math.min(canvas.height - canvas.height * 0.15, playerY.current + canvas.height * 0.1);
  };

  return (
    <div className="fixed inset-0 flex min-h-[100dvh] flex-col bg-[#020617] text-white">
      <div className="h-12 flex items-center justify-between border-b border-cyan-500/20 px-3">
        <span className="text-sm tracking-widest">PONG</span>
        <button
          type="button"
          onClick={onExit}
          className="rounded-lg border border-cyan-400/30 bg-slate-900/70 px-3 py-1 text-xs text-cyan-100"
        >
          Exit
        </button>
      </div>

      <div ref={containerRef} className="flex-1 w-full">
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>

      <div className="space-y-2 border-t border-cyan-400/20 bg-white/5 p-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={moveUp} className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3">
            ↑
          </button>
          <button type="button" onClick={moveDown} className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3">
            ↓
          </button>
        </div>
      </div>
    </div>
  );
}
