"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Volume2, VolumeX, X } from "lucide-react";
import { GLOBAL_SPEED, useAnimationFrame, useCanvasResize } from "@/components/pxplay/games/shared";

export function SnakeGame({ onExit }: { onExit: () => void }) {
  const W = 760;
  const H = 760;
  const GRID = 22;
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const snakeRef = useRef<Array<{ x: number; y: number }>>([{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }]);
  const dirRef = useRef({ x: 1, y: 0 });
  const nextDirRef = useRef({ x: 1, y: 0 });
  const foodRef = useRef({ x: 15, y: 10 });
  const accumRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useCanvasResize(containerRef, canvasRef, W, H);

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem("px_google_snake_best") ?? 0);
      if (Number.isFinite(saved) && saved > 0) setBest(saved);
    } catch {
      // ignore storage failures
    }
  }, []);

  const ensureAudio = useCallback(() => {
    if (muted) return null;
    if (!audioRef.current) audioRef.current = new window.AudioContext();
    if (audioRef.current.state === "suspended") {
      void audioRef.current.resume();
    }
    return audioRef.current;
  }, [muted]);

  const tone = useCallback((freq: number, ms: number, type: OscillatorType = "square", volume = 0.03) => {
    const ctx = ensureAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + ms / 1000);
    osc.start(now);
    osc.stop(now + ms / 1000);
  }, [ensureAudio]);

  const startSnakeGame = useCallback(() => {
    snakeRef.current = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
    dirRef.current = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
    foodRef.current = { x: 15, y: 10 };
    accumRef.current = 0;
    setScore(0);
    setOver(false);
    tone(440, 65, "triangle", 0.02);
  }, [tone]);

  const setDir = useCallback((x: number, y: number) => {
    const d = dirRef.current;
    if (d.x === -x && d.y === -y) return;
    nextDirRef.current = { x, y };
    tone(280, 24, "square", 0.012);
  }, [tone]);

  useEffect(() => {
    const onFull = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFull);
    return () => document.removeEventListener("fullscreenchange", onFull);
  }, []);

  const toggleFullscreen = async () => {
    const root = rootRef.current;
    if (!root) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await root.requestFullscreen();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowup" || k === "w") setDir(0, -1);
      if (k === "arrowdown" || k === "s") setDir(0, 1);
      if (k === "arrowleft" || k === "a") setDir(-1, 0);
      if (k === "arrowright" || k === "d") setDir(1, 0);
      if (k === "r") startSnakeGame();
      if (k === "m") setMuted((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startSnakeGame, setDir]);

  useAnimationFrame((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const speed = Math.max(0.06 / GLOBAL_SPEED, (0.14 - Math.floor(score / 80) * 0.005) / GLOBAL_SPEED);

    if (!over) {
      accumRef.current += dt;
      if (accumRef.current >= speed) {
        accumRef.current = 0;
        const nd = nextDirRef.current;
        const cd = dirRef.current;
        if (!(nd.x === -cd.x && nd.y === -cd.y)) dirRef.current = nd;
        const head = snakeRef.current[0];
        const moved = { x: head.x + dirRef.current.x, y: head.y + dirRef.current.y };
        const hitWall = moved.x < 0 || moved.y < 0 || moved.x >= GRID || moved.y >= GRID;
        const hitSelf = snakeRef.current.some((s) => s.x === moved.x && s.y === moved.y);
        if (hitWall || hitSelf) {
          setOver(true);
          tone(180, 220, "sawtooth", 0.045);
        } else {
          snakeRef.current = [moved, ...snakeRef.current];
          if (moved.x === foodRef.current.x && moved.y === foodRef.current.y) {
            setScore((v) => {
              const nextScore = v + 1;
              if (nextScore > best) {
                setBest(nextScore);
                try {
                  window.localStorage.setItem("px_google_snake_best", String(nextScore));
                } catch {
                  // ignore storage failures
                }
              }
              return nextScore;
            });
            tone(740, 65, "triangle", 0.03);
            tone(930, 75, "triangle", 0.02);
            let next = foodRef.current;
            do {
              next = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
            } while (snakeRef.current.some((s) => s.x === next.x && s.y === next.y));
            foodRef.current = next;
          } else {
            snakeRef.current.pop();
          }
        }
      }
    }

    const cell = Math.floor(Math.min(W, H) / GRID);
    const boardW = cell * GRID;
    const boardH = cell * GRID;
    const ox = Math.floor((W - boardW) / 2);
    const oy = Math.floor((H - boardH) / 2);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#8fc24a";
    ctx.fillRect(0, 0, W, H);
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

      ctx.fillStyle = "#3156b8";
      ctx.beginPath();
      ctx.arc(headW * 0.35, 0, Math.max(1.8, cell * 0.09), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = "#ef3f2f";
    const fx = ox + foodRef.current.x * cell + cell / 2;
    const fy = oy + foodRef.current.y * cell + cell / 2;
    ctx.beginPath();
    ctx.arc(fx, fy, Math.max(4, cell * 0.3), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5fbf3e";
    ctx.beginPath();
    ctx.ellipse(fx + cell * 0.2, fy - cell * 0.3, cell * 0.12, cell * 0.07, -0.45, 0, Math.PI * 2);
    ctx.fill();
  }, true);

  return (
    <div ref={rootRef} data-px-game-active="true" className="fixed inset-0 z-50 flex min-h-[100dvh] flex-col bg-[#4d8430] text-white">
      <header className="flex h-14 items-center justify-between border-b border-[#3f7026] bg-[#4d8430] px-4">
        <div className="flex items-center gap-8">
          <p className="flex items-center gap-2 text-3xl font-semibold"><span>🍎</span><span className="text-white">{score}</span></p>
          <p className="flex items-center gap-2 text-3xl font-semibold"><span>🏆</span><span className="text-white">{best}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={toggleFullscreen} className="rounded-md p-1.5 text-white/95">
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
          <button type="button" onClick={() => setMuted((v) => !v)} className="rounded-md p-1.5 text-white/95">
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
          <button type="button" onClick={onExit} className="rounded-md p-1.5 text-white/95">
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1 p-5">
        <div ref={containerRef} className="relative mx-auto flex h-full w-full max-w-[980px] items-center justify-center rounded-sm border-[5px] border-[#6ea33f] bg-[#a5d64f]">
          <canvas
            ref={canvasRef}
            className="block max-h-full max-w-full touch-none"
            onTouchStart={(e) => {
              const t = e.touches[0];
              if (!t) return;
              touchStartRef.current = { x: t.clientX, y: t.clientY };
            }}
            onTouchEnd={(e) => {
              const t = e.changedTouches[0];
              const start = touchStartRef.current;
              if (!t || !start) return;
              const dx = t.clientX - start.x;
              const dy = t.clientY - start.y;
              if (Math.abs(dx) < 14 && Math.abs(dy) < 14) return;
              if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
              else setDir(0, dy > 0 ? 1 : -1);
            }}
          />
          <button
            id="snakeRestartBtn"
            type="button"
            onClick={startSnakeGame}
            className="snake-restart-btn"
            style={{ display: over ? "block" : "none" }}
          >
            Restart
          </button>
        </div>
      </div>
    </div>
  );
}
