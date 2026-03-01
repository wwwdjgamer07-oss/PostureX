"use client";

import { useEffect, useRef, useState } from "react";
import GameModelSuggestion from "@/components/games/GameModelSuggestion";

type SnakeMobileProps = {
  onExit?: () => void;
};

type Point = { x: number; y: number };
type Dir = { x: number; y: number };

const GRID = 22;
const MAX_DPR = 3;

export default function SnakeMobile({ onExit }: SnakeMobileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const touchStartRef = useRef<Point | null>(null);
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
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
    };
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
      ctx.imageSmoothingEnabled = true;

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

      const cell = Math.floor(Math.min(canvas.width, canvas.height) / GRID);
      const boardW = cell * GRID;
      const boardH = cell * GRID;
      const ox = Math.floor((canvas.width - boardW) / 2);
      const oy = Math.floor((canvas.height - boardH) / 2);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#8fc24a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#a5d755";
      ctx.fillRect(ox, oy, boardW, boardH);
      ctx.fillStyle = "#9dd14f";
      for (let y = 0; y < GRID; y += 1) {
        for (let x = 0; x < GRID; x += 1) {
          if ((x + y) % 2 === 0) ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
        }
      }

      const head = snakeRef.current[0];
      const bodyColor = "#4f7de8";
      const headColor = "#4a73db";
      for (let i = snakeRef.current.length - 1; i >= 1; i -= 1) {
        const p = snakeRef.current[i];
        const bx = ox + p.x * cell + cell * 0.08;
        const by = oy + p.y * cell + cell * 0.14;
        const bw = cell * 0.84;
        const bh = cell * 0.72;
        const br = Math.max(6, cell * 0.38);
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, br);
        ctx.fill();
      }

      if (head) {
        const headCx = ox + head.x * cell + cell / 2;
        const headCy = oy + head.y * cell + cell / 2;
        const headW = cell * 0.92;
        const headH = cell * 0.8;
        const hr = Math.max(8, cell * 0.42);

        ctx.save();
        ctx.translate(headCx, headCy);
        if (dirRef.current.x === 1) ctx.rotate(0);
        if (dirRef.current.x === -1) ctx.rotate(Math.PI);
        if (dirRef.current.y === -1) ctx.rotate(-Math.PI / 2);
        if (dirRef.current.y === 1) ctx.rotate(Math.PI / 2);

        ctx.fillStyle = headColor;
        ctx.beginPath();
        ctx.roundRect(-headW / 2, -headH / 2, headW, headH, hr);
        ctx.fill();

        const eyeR = Math.max(3, cell * 0.19);
        const pupilR = Math.max(1.4, cell * 0.08);
        const eyeOffsetX = cell * 0.21;
        const eyeY = -cell * 0.16;
        ctx.fillStyle = "#e5edff";
        ctx.beginPath();
        ctx.arc(eyeOffsetX, eyeY, eyeR, 0, Math.PI * 2);
        ctx.arc(eyeOffsetX, -eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1e3a8a";
        ctx.beginPath();
        ctx.arc(eyeOffsetX + eyeR * 0.25, eyeY, pupilR, 0, Math.PI * 2);
        ctx.arc(eyeOffsetX + eyeR * 0.25, -eyeY, pupilR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      const fx = ox + foodRef.current.x * cell + cell / 2;
      const fy = oy + foodRef.current.y * cell + cell / 2;
      ctx.fillStyle = "#ef3f2f";
      ctx.beginPath();
      ctx.arc(fx, fy, Math.max(4, cell * 0.3), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5fbf3e";
      ctx.beginPath();
      ctx.ellipse(fx + cell * 0.2, fy - cell * 0.3, cell * 0.12, cell * 0.07, -0.45, 0, Math.PI * 2);
      ctx.fill();

      if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(ox + boardW * 0.2, oy + boardH * 0.42, boardW * 0.6, 56);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 18px ui-sans-serif, system-ui, sans-serif";
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

  const onTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const applyTouchDirection = (touch: React.Touch) => {
    const start = touchStartRef.current;
    if (!start) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      setDir(dx > 0 ? 1 : -1, 0);
    } else {
      setDir(0, dy > 0 ? 1 : -1);
    }

    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchMove = (event: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    applyTouchDirection(touch);
  };

  const onTouchEnd = (event: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = event.changedTouches[0];
    if (!touch) return;
    applyTouchDirection(touch);
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
      <div className="flex h-12 items-center justify-between border-b border-cyan-500/20 px-3">
        <span className="text-sm tracking-widest">SNAKE</span>
        <button
          type="button"
          onClick={onExit}
          className="rounded-lg border border-cyan-400/30 bg-slate-900/70 px-3 py-1 text-xs text-cyan-100"
        >
          Exit
        </button>
      </div>

      <div ref={containerRef} className="relative h-[65vh] w-full flex-1 bg-black md:h-[520px]">
        <canvas ref={canvasRef} className="h-full w-full touch-none" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} />
      </div>

      <div className="space-y-3 border-t border-cyan-400/20 bg-white/5 p-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <p className="text-sm text-cyan-100">Score: {score} - Swipe on the board to turn</p>
        <button type="button" onClick={restart} className="w-full rounded-2xl border border-cyan-400/30 bg-cyan-500/15 p-3 shadow-[0_0_24px_rgba(34,211,238,0.18)]">
          Restart
        </button>
        <GameModelSuggestion game="snake" compact />
      </div>
    </div>
  );
}
