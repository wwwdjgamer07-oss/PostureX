"use client";

import { useEffect, useRef, useState } from "react";

type BreakoutMobileProps = {
  onExit?: () => void;
};

type Brick = { x: number; y: number; w: number; h: number; alive: boolean };
const MAX_DPR = 2;

export default function BreakoutMobile({ onExit }: BreakoutMobileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const paddleX = useRef(120);
  const ball = useRef({ x: 180, y: 360, vx: 150, vy: -150 });
  const bricksRef = useRef<Brick[]>([]);
  const [score, setScore] = useState(0);

  const spawnBricks = () => {
    const items: Brick[] = [];
    const cols = 7;
    const bw = 42;
    const bh = 14;
    const gap = 6;
    const startX = 18;
    const startY = 54;
    for (let r = 0; r < 5; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        items.push({ x: startX + c * (bw + gap), y: startY + r * (bh + gap), w: bw, h: bh, alive: true });
      }
    }
    bricksRef.current = items;
  };

  useEffect(() => {
    spawnBricks();
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
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
      ctx.imageSmoothingEnabled = false;

      const dt = 1 / 60;
      const w = canvas.width;
      const h = canvas.height;
      const paddleW = 92;
      const paddleH = 10;
      const paddleY = h - 24;

      ball.current.x += ball.current.vx * dt;
      ball.current.y += ball.current.vy * dt;

      if (ball.current.x < 8 || ball.current.x > w - 8) ball.current.vx *= -1;
      if (ball.current.y < 8) ball.current.vy *= -1;

      if (
        ball.current.y >= paddleY - 8 &&
        ball.current.y <= paddleY + paddleH &&
        ball.current.x >= paddleX.current &&
        ball.current.x <= paddleX.current + paddleW
      ) {
        ball.current.vy = -Math.abs(ball.current.vy);
      }

      for (const brick of bricksRef.current) {
        if (!brick.alive) continue;
        if (
          ball.current.x >= brick.x &&
          ball.current.x <= brick.x + brick.w &&
          ball.current.y >= brick.y &&
          ball.current.y <= brick.y + brick.h
        ) {
          brick.alive = false;
          ball.current.vy *= -1;
          setScore((v) => v + 10);
          break;
        }
      }

      if (ball.current.y > h + 20) {
        ball.current = { x: w / 2, y: h * 0.7, vx: 150, vy: -150 };
      }

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, w, h);

      for (const brick of bricksRef.current) {
        if (!brick.alive) continue;
        ctx.fillStyle = "rgba(34,211,238,0.88)";
        ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
      }

      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(paddleX.current, paddleY, paddleW, paddleH);
      ctx.beginPath();
      ctx.arc(ball.current.x, ball.current.y, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#a5f3fc";
      ctx.font = "600 18px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(`Score ${score}`, 12, 28);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [score]);

  const moveLeft = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    paddleX.current = Math.max(0, paddleX.current - canvas.width * 0.14);
  };
  const moveRight = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const paddleW = 92;
    paddleX.current = Math.min(canvas.width - paddleW, paddleX.current + canvas.width * 0.14);
  };

  return (
    <div className="fixed inset-0 flex min-h-[100dvh] flex-col bg-[#020617] text-white">
      <div className="flex h-12 items-center justify-between border-b border-cyan-500/20 px-3">
        <span className="text-sm tracking-widest">BREAKOUT</span>
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
          <button type="button" onClick={moveLeft} className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3 text-sm font-semibold">
            Left
          </button>
          <button type="button" onClick={moveRight} className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3 text-sm font-semibold">
            Right
          </button>
        </div>
      </div>
    </div>
  );
}
