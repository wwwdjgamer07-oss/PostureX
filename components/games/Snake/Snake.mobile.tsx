"use client";

import { useEffect, useRef, useState } from "react";

type SnakeMobileProps = {
  onExit?: () => void;
};

type Point = { x: number; y: number };
type Dir = { x: number; y: number };

const GRID = 22;
const CANVAS_RESOLUTION_SCALE = 0.72;

export default function SnakeMobile({ onExit }: SnakeMobileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const snakeRef = useRef<Point[]>([{ x: 8, y: 11 }, { x: 7, y: 11 }, { x: 6, y: 11 }]);
  const dirRef = useRef<Dir>({ x: 1, y: 0 });
  const nextDirRef = useRef<Dir>({ x: 1, y: 0 });
  const foodRef = useRef<Point>({ x: 16, y: 9 });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.max(1, Math.floor(width * CANVAS_RESOLUTION_SCALE));
      canvas.height = Math.max(1, Math.floor(height * CANVAS_RESOLUTION_SCALE));
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const render = (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      const tickMs = 120;
      if (!gameOver && time - lastTickRef.current >= tickMs) {
        lastTickRef.current = time;
        const current = dirRef.current;
        const next = nextDirRef.current;
        if (!(next.x === -current.x && next.y === -current.y)) {
          dirRef.current = next;
        }

        const head = snakeRef.current[0];
        const moved = { x: head.x + dirRef.current.x, y: head.y + dirRef.current.y };
        if (moved.x < 0 || moved.y < 0 || moved.x >= GRID || moved.y >= GRID || snakeRef.current.some((p) => p.x === moved.x && p.y === moved.y)) {
          setGameOver(true);
        } else {
          snakeRef.current = [moved, ...snakeRef.current];
          if (moved.x === foodRef.current.x && moved.y === foodRef.current.y) {
            setScore((v) => v + 10);
            foodRef.current = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
          } else {
            snakeRef.current.pop();
          }
        }
      }

      const cell = Math.min(canvas.width, canvas.height) / GRID;
      const boardW = cell * GRID;
      const boardH = cell * GRID;
      const ox = (canvas.width - boardW) / 2;
      const oy = (canvas.height - boardH) / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#0b1220";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#111d31";
      ctx.fillRect(ox, oy, boardW, boardH);

      ctx.fillStyle = "#22d3ee";
      for (const p of snakeRef.current) {
        ctx.fillRect(ox + p.x * cell + 1, oy + p.y * cell + 1, cell - 2, cell - 2);
      }

      ctx.fillStyle = "#ef4444";
      ctx.fillRect(ox + foodRef.current.x * cell + 2, oy + foodRef.current.y * cell + 2, cell - 4, cell - 4);

      if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(ox + boardW * 0.2, oy + boardH * 0.42, boardW * 0.6, 56);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Game Over", ox + boardW / 2, oy + boardH * 0.42 + 34);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [gameOver]);

  const setDir = (x: number, y: number) => {
    nextDirRef.current = { x, y };
  };

  const restart = () => {
    snakeRef.current = [{ x: 8, y: 11 }, { x: 7, y: 11 }, { x: 6, y: 11 }];
    dirRef.current = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
    foodRef.current = { x: 16, y: 9 };
    lastTickRef.current = 0;
    setScore(0);
    setGameOver(false);
  };

  return (
    <div className="fixed inset-0 flex min-h-[100dvh] flex-col bg-[#020617] text-white">
      <div className="h-12 flex items-center justify-between border-b border-cyan-500/20 px-3">
        <span className="text-sm tracking-widest">SNAKE</span>
        <button
          type="button"
          onClick={onExit}
          className="rounded-lg border border-cyan-400/30 bg-slate-900/70 px-3 py-1 text-xs text-cyan-100"
        >
          Exit
        </button>
      </div>

      <div ref={containerRef} className="flex-1 w-full bg-black">
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>

      <div className="space-y-3 border-t border-cyan-400/20 bg-white/5 p-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <p className="text-sm text-cyan-100">Score: {score}</p>
        <div className="grid grid-cols-3 gap-2">
          <span />
          <button type="button" onClick={() => setDir(0, -1)} className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3">
            ↑
          </button>
          <span />
          <button type="button" onClick={() => setDir(-1, 0)} className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3">
            ←
          </button>
          <button type="button" onClick={() => setDir(0, 1)} className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3">
            ↓
          </button>
          <button type="button" onClick={() => setDir(1, 0)} className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3">
            →
          </button>
        </div>
        <button type="button" onClick={restart} className="w-full rounded-2xl border border-cyan-400/30 bg-cyan-500/15 p-3 shadow-[0_0_24px_rgba(34,211,238,0.18)]">
          Restart
        </button>
      </div>
    </div>
  );
}
