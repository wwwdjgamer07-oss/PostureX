"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Brain, Brackets, CircleDot, Gamepad2, Grid3X3, Layers, Maximize2, Minimize2, Rocket, Volume2, VolumeX, X } from "lucide-react";

type GameId = "snake" | "lander" | "xo" | "pong" | "breakout" | "memory";

type Tile = {
  id: GameId;
  name: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
};

const TILES: Tile[] = [
  { id: "snake", name: "Snake", subtitle: "Swipe to survive", icon: Brain },
  { id: "lander", name: "Lander", subtitle: "Thrust to land", icon: Rocket },
  { id: "xo", name: "XO", subtitle: "Beat the AI", icon: Grid3X3 },
  { id: "pong", name: "Pong", subtitle: "Reflex duel", icon: CircleDot },
  { id: "breakout", name: "Breakout", subtitle: "Clear all bricks", icon: Brackets },
  { id: "memory", name: "Memory", subtitle: "Match all pairs", icon: Layers }
];
const MEMORY_SYMBOLS = ["PX", "AI", "UX", "RX", "GO", "VR"] as const;

const MAX_DPR = 3;
const GLOBAL_SPEED = 1.6;
const UI_TEXT = "#EAF6FF";
const UI_ACCENT = "#7FDBFF";
const UI_MUTED = "#A9C7D9";
const TOUCH_BTN_BASE =
  "rounded-xl border border-cyan-300/45 bg-cyan-400/10 py-3 text-sm font-semibold text-cyan-100 backdrop-blur-md active:bg-cyan-400/25";
const TOUCH_BTN_SUBTLE =
  "rounded-xl border border-cyan-300/45 bg-slate-900/35 py-3 text-sm font-semibold text-cyan-100 backdrop-blur-md active:bg-cyan-400/20";
const TOUCH_ACTION_BTN =
  "rounded-xl border border-cyan-300/45 bg-cyan-400/12 px-4 py-2 text-sm text-cyan-100 backdrop-blur-md active:bg-cyan-400/24";

type LinearDifficultyStats = {
  wins: number;
  failures: number;
  avgWinSeconds: number;
};

type LinearDifficultyLearner = {
  weights: [number, number, number, number, number];
  lr: number;
};

const globalKeys: Record<string, boolean> = {};
let globalKeyListenersReady = false;

function ensureGlobalKeyListeners() {
  if (globalKeyListenersReady || typeof window === "undefined") return;
  window.addEventListener("keydown", (event) => {
    globalKeys[event.code] = true;
  });
  window.addEventListener("keyup", (event) => {
    globalKeys[event.code] = false;
  });
  globalKeyListenersReady = true;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getScale(baseW: number, baseH: number) {
  if (typeof window === "undefined") return 1;
  return Math.min(window.innerWidth / baseW, window.innerHeight / baseH);
}

function createLinearDifficultyLearner(): LinearDifficultyLearner {
  return {
    // bias, level, success-rate, speed, failure-rate
    weights: [1.0, 0.26, 0.42, 0.34, -0.2],
    lr: 0.08
  };
}

function difficultyFeatures(level: number, stats: LinearDifficultyStats): [number, number, number, number, number] {
  const total = Math.max(1, stats.wins + stats.failures);
  const successRate = stats.wins / total;
  const failureRate = stats.failures / total;
  const levelNorm = clampNumber(level / 20, 0, 1);
  const speedScore = clampNumber((28 - stats.avgWinSeconds) / 28, 0, 1);
  return [1, levelNorm, successRate, speedScore, failureRate];
}

function predictDifficulty(learner: LinearDifficultyLearner, level: number, stats: LinearDifficultyStats) {
  const x = difficultyFeatures(level, stats);
  const raw = learner.weights.reduce((sum, w, idx) => sum + w * x[idx], 0);
  return clampNumber(raw, 0.85, 2.4);
}

function trainDifficultyModel(
  learner: LinearDifficultyLearner,
  level: number,
  stats: LinearDifficultyStats,
  outcome: "win" | "fail"
) {
  const x = difficultyFeatures(level, stats);
  const prediction = predictDifficulty(learner, level, stats);
  const speedScore = x[3];
  const baseTarget = clampNumber(1 + level * 0.05, 0.95, 2.2);
  const target = outcome === "win"
    ? clampNumber(baseTarget + 0.1 + speedScore * 0.35, 0.95, 2.3)
    : clampNumber(baseTarget - 0.24, 0.85, 2.1);

  const error = target - prediction;
  learner.weights = learner.weights.map((w, idx) => (w + learner.lr * error * x[idx])) as LinearDifficultyLearner["weights"];
  return predictDifficulty(learner, level, stats);
}

function useAnimationFrame(loop: (dt: number) => void, enabled: boolean) {
  const rafRef = useRef<number | null>(null);
  const prevRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const tick = (time: number) => {
      if (!prevRef.current) prevRef.current = time;
      const dt = Math.min(0.05, (time - prevRef.current) / 1000);
      prevRef.current = time;
      loop(dt);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      prevRef.current = 0;
    };
  }, [enabled, loop]);
}

function useCanvasResize(containerRef: React.RefObject<HTMLDivElement>, canvasRef: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(container);
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
    };
  }, [containerRef, canvasRef]);
}

function GameShell({
  title,
  subtitle,
  headerMeta,
  onExit,
  children,
  footer
}: {
  title: string;
  subtitle: string;
  headerMeta?: React.ReactNode;
  onExit: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="game-container fixed inset-0 z-50 flex min-h-[100dvh] flex-col bg-[#020617] text-white">
      <header className="flex h-12 items-center justify-between border-b border-cyan-400/20 bg-black/30 px-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-100">{title}</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{subtitle}</p>
          {headerMeta}
        </div>
        <button type="button" onClick={onExit} className="rounded-md border border-cyan-300/45 bg-slate-900/70 px-3 py-1 text-xs text-cyan-100">Exit</button>
      </header>
      <div className="relative min-h-0 flex-1">
        {children}
        {footer ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3 pb-[env(safe-area-inset-bottom)]">
            <div className="pointer-events-auto rounded-2xl border border-cyan-300/25 bg-slate-900/25 p-2 backdrop-blur-xl">{footer}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SnakeGame({ onExit }: { onExit: () => void }) {
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

  useCanvasResize(containerRef, canvasRef);

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
    const GRID = 22;
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
    <div ref={rootRef} className="fixed inset-0 z-50 flex min-h-[100dvh] flex-col bg-[#4d8430] text-white">
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
        <div ref={containerRef} className="relative mx-auto h-full w-full max-w-[980px] rounded-sm border-[5px] border-[#6ea33f] bg-[#a5d64f]">
          <canvas
            ref={canvasRef}
            className="h-full w-full touch-none"
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
function LanderGame({ onExit }: { onExit: () => void }) {
  const GRAVITY = 0.035;
  const THRUST = 0.08;
  const ROT_SPEED = 0.03;
  const FUEL_BURN = 0.25;
  const MAX_SAFE_VY = 1.6;
  const MAX_SAFE_ANGLE = 18;
  const PAD_WIDTH = 120;
  const PAD_HEIGHT = 8;
  const MOBILE_BOOST = 1.15;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const leftRef = useRef(false);
  const rightRef = useRef(false);
  const thrustRef = useRef(false);
  const shipRef = useRef({ x: 220, y: 120, vx: 0, vy: 0, a: 0 });
  const terrainRef = useRef<Array<{ x: number; y: number }>>([]);
  const padRef = useRef({ x: 0, w: PAD_WIDTH, y: 0 });
  const thrustPowerRef = useRef(0);
  const isMobileRef = useRef(false);
  const [fuel, setFuel] = useState(320);
  const [state, setState] = useState<"running" | "won" | "crashed">("running");
  const [level, setLevel] = useState(1);
  const levelStartedAtRef = useRef<number>(Date.now());
  const diffStatsRef = useRef<LinearDifficultyStats>({ wins: 0, failures: 0, avgWinSeconds: 20 });
  const learnerRef = useRef<LinearDifficultyLearner>(createLinearDifficultyLearner());
  const difficultyScaleRef = useRef<number>(1);

  useCanvasResize(containerRef, canvasRef);

  const regenerate = useCallback((w: number, h: number) => {
    const points: Array<{ x: number; y: number }> = [];
    const step = Math.max(28, Math.floor(w / 14));
    const padLeft = Math.max(24, Math.min(w - PAD_WIDTH - 24, w * 0.62 - PAD_WIDTH / 2));
    const padRight = padLeft + PAD_WIDTH;
    let x = 0;
    while (x <= w + step) {
      let y = h * (0.68 + Math.sin(x * 0.012) * 0.1 + (Math.random() - 0.5) * 0.06);
      if (x >= padLeft && x <= padRight) {
        y = h * 0.72;
      }
      points.push({ x, y });
      x += step;
    }
    const padY = h * 0.72;
    for (let i = 0; i < points.length; i += 1) {
      if (points[i].x >= padLeft && points[i].x <= padRight) {
        points[i].y = padY;
      }
    }
    terrainRef.current = points;
    padRef.current = { x: padLeft, w: PAD_WIDTH, y: padY };
  }, []);

  const restart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    shipRef.current = { x: canvas.width * 0.2, y: canvas.height * 0.2, vx: 0, vy: 0, a: 0 };
    thrustPowerRef.current = 0;
    setLevel(1);
    levelStartedAtRef.current = Date.now();
    diffStatsRef.current = { wins: 0, failures: 0, avgWinSeconds: 20 };
    learnerRef.current = createLinearDifficultyLearner();
    difficultyScaleRef.current = 1;
    setFuel(360);
    setState("running");
    regenerate(canvas.width, canvas.height);
  }, [regenerate]);

  const registerOutcome = useCallback((outcome: "win" | "fail", atLevel: number) => {
    const elapsed = Math.max(3, (Date.now() - levelStartedAtRef.current) / 1000);
    const stats = diffStatsRef.current;
    if (outcome === "win") {
      const nextWins = stats.wins + 1;
      stats.avgWinSeconds = (stats.avgWinSeconds * stats.wins + elapsed) / Math.max(1, nextWins);
      stats.wins = nextWins;
    } else {
      stats.failures += 1;
    }
    difficultyScaleRef.current = trainDifficultyModel(learnerRef.current, atLevel, stats, outcome);
  }, []);

  const nextLevel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const difficulty = difficultyScaleRef.current;
    setLevel((prev) => {
      const upcoming = prev + 1;
      regenerate(canvas.width, canvas.height);
      shipRef.current = { x: canvas.width * 0.2, y: canvas.height * 0.2, vx: 0, vy: 0, a: 0 };
      thrustPowerRef.current = 0;
      setFuel(Math.max(220, Math.round(360 - (upcoming - 1) * (6 + difficulty * 4))));
      setState("running");
      levelStartedAtRef.current = Date.now();
      return upcoming;
    });
  }, [regenerate]);

  useEffect(() => { restart(); }, [restart]);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    isMobileRef.current = /Mobi|Android/i.test(navigator.userAgent);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") leftRef.current = true;
      if (k === "arrowright" || k === "d") rightRef.current = true;
      if (k === "arrowup" || k === "w" || k === " ") thrustRef.current = true;
      if (k === "r") restart();
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") leftRef.current = false;
      if (k === "arrowright" || k === "d") rightRef.current = false;
      if (k === "arrowup" || k === "w" || k === " ") thrustRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [restart]);

  const terrainY = useCallback((x: number) => {
    const t = terrainRef.current;
    if (t.length < 2) return 0;
    for (let i = 0; i < t.length - 1; i += 1) {
      const a = t[i];
      const b = t[i + 1];
      if (x >= a.x && x <= b.x) {
        const r = (x - a.x) / Math.max(1, b.x - a.x);
        return a.y + (b.y - a.y) * r;
      }
    }
    return t[t.length - 1].y;
  }, []);

  useAnimationFrame((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    if (!terrainRef.current.length) regenerate(w, h);

    if (state === "running") {
      const step = dt * 60;
      const rotatingLeft = leftRef.current;
      const rotatingRight = rightRef.current;
      const thrusting = thrustRef.current && fuel > 0;

      if (rotatingLeft) shipRef.current.a -= ROT_SPEED * step;
      if (rotatingRight) shipRef.current.a += ROT_SPEED * step;
      if (!rotatingLeft && !rotatingRight) {
        shipRef.current.a *= Math.pow(0.98, step);
      }

      if (thrusting) {
        thrustPowerRef.current += 0.002 * step;
      } else {
        thrustPowerRef.current *= Math.pow(0.9, step);
      }
      thrustPowerRef.current = Math.min(THRUST, Math.max(0, thrustPowerRef.current));

      let effectiveThrust = thrustPowerRef.current;
      if (isMobileRef.current) {
        effectiveThrust *= MOBILE_BOOST;
      }

      if (thrusting) {
        setFuel((f) => Math.max(0, f - FUEL_BURN * step));
      }

      shipRef.current.vx += Math.sin(shipRef.current.a) * effectiveThrust * 0.45 * step;
      shipRef.current.vy += GRAVITY * step;
      shipRef.current.vy -= effectiveThrust * step;
      shipRef.current.x += shipRef.current.vx * step;
      shipRef.current.y += shipRef.current.vy * step;
      shipRef.current.x = Math.max(10, Math.min(w - 10, shipRef.current.x));

      const groundY = terrainY(shipRef.current.x);
      const shipBottom = shipRef.current.y + 8;
      const padTop = padRef.current.y - PAD_HEIGHT / 2;
      const padLeft = padRef.current.x;
      const padRight = padRef.current.x + padRef.current.w;
      const angleDeg = Math.abs((shipRef.current.a * 180) / Math.PI);
      const canLand =
        Math.abs(shipRef.current.vy) < MAX_SAFE_VY &&
        Math.abs(shipRef.current.vx) < 1.2 &&
        angleDeg < MAX_SAFE_ANGLE &&
        shipBottom >= padTop &&
        shipRef.current.x > padLeft &&
        shipRef.current.x < padRight;

      if (shipBottom >= groundY) {
        const onPad = shipRef.current.x > padLeft && shipRef.current.x < padRight;
        const success = onPad && canLand;
        setState(success ? "won" : "crashed");
        registerOutcome(success ? "win" : "fail", level);
        shipRef.current.y = groundY - 8;
        shipRef.current.vx = 0;
        shipRef.current.vy = 0;
        thrustPowerRef.current = 0;
      }
    }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 3;
    ctx.beginPath();
    const terr = terrainRef.current;
    if (terr.length) {
      ctx.moveTo(terr[0].x, terr[0].y);
      for (let i = 1; i < terr.length; i += 1) ctx.lineTo(terr[i].x, terr[i].y);
    }
    ctx.stroke();
    ctx.fillStyle = "#64748b";
    ctx.fillRect(padRef.current.x, padRef.current.y - PAD_HEIGHT / 2, padRef.current.w, PAD_HEIGHT);

    ctx.save();
    ctx.translate(shipRef.current.x, shipRef.current.y);
    ctx.rotate(shipRef.current.a);
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(-8, 8);
    ctx.lineTo(8, 8);
    ctx.closePath();
    ctx.stroke();
    if (thrustRef.current && fuel > 0 && state === "running") {
      ctx.strokeStyle = "#22d3ee";
      ctx.beginPath();
      ctx.moveTo(-3, 8);
      ctx.lineTo(0, 14 + Math.random() * 8);
      ctx.lineTo(3, 8);
      ctx.stroke();
    }
    ctx.restore();

    const hudScale = Math.max(0.8, getScale(800, 600));
    ctx.fillStyle = UI_TEXT;
    ctx.font = `600 ${Math.max(14, Math.floor(18 * hudScale))}px ui-monospace, Menlo, Consolas, monospace`;
    ctx.fillText(`Fuel ${Math.round(fuel)}`, 14, 24);
    ctx.fillStyle = UI_ACCENT;
    ctx.fillText(`Level ${level}`, 14, 46);
    ctx.fillStyle = UI_MUTED;
    ctx.fillText(`Easy Assist`, 14, 68);
    if (state !== "running") {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(w * 0.22, h * 0.2, w * 0.56, 90);
      ctx.fillStyle = state === "won" ? "#86efac" : "#fda4af";
      ctx.font = "bold 28px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.fillText(state === "won" ? "LEVEL CLEAR" : "Crash", w / 2, h * 0.28);
      if (state === "won") {
        ctx.font = "600 14px ui-sans-serif, system-ui";
        ctx.fillText("Game paused - press Next Level", w / 2, h * 0.33);
      }
    }
  }, true);

  return (
    <GameShell
      title="Lunar Lander"
      subtitle="Hold left / thrust / right"
      onExit={onExit}
    >
      <div ref={containerRef} className="h-full w-full">
        <canvas ref={canvasRef} className="lander-canvas h-full w-full" />
        <div className="lander-controls">
          <button type="button" onTouchStart={() => { leftRef.current = true; }} onTouchEnd={() => { leftRef.current = false; }} onTouchCancel={() => { leftRef.current = false; }} className={TOUCH_BTN_SUBTLE}>Left</button>
          <button type="button" onTouchStart={() => { thrustRef.current = true; }} onTouchEnd={() => { thrustRef.current = false; }} onTouchCancel={() => { thrustRef.current = false; }} className={TOUCH_BTN_BASE}>Thrust</button>
          <button type="button" onTouchStart={() => { rightRef.current = true; }} onTouchEnd={() => { rightRef.current = false; }} onTouchCancel={() => { rightRef.current = false; }} className={TOUCH_BTN_SUBTLE}>Right</button>
          <button type="button" onClick={state === "won" ? nextLevel : restart} className={TOUCH_BTN_BASE}>
            {state === "won" ? "Next Level" : "Restart"}
          </button>
        </div>
      </div>
    </GameShell>
  );
}

function PongGame({ onExit }: { onExit: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerY = useRef(200);
  const aiY = useRef(200);
  const ball = useRef({ x: 300, y: 200, vx: 240 * GLOBAL_SPEED, vy: 160 * GLOBAL_SPEED });
  const [score, setScore] = useState({ you: 0, ai: 0 });

  useCanvasResize(containerRef, canvasRef);
  useEffect(() => {
    ensureGlobalKeyListeners();
  }, []);
  const resetRound = useCallback((dir: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    ball.current = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: 240 * GLOBAL_SPEED * dir,
      vy: (Math.random() > 0.5 ? 1 : -1) * 140 * GLOBAL_SPEED
    };
  }, []);
  const restart = useCallback(() => {
    setScore({ you: 0, ai: 0 });
    resetRound(Math.random() > 0.5 ? 1 : -1);
  }, [resetRound]);
  useEffect(() => { restart(); }, [restart]);

  useAnimationFrame((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const paddleH = Math.max(90, Math.floor(h * 0.18));
    const paddleW = 10;
    const paddleSpeed = Math.max(10, h * 0.015);
    if (globalKeys.ArrowUp || globalKeys.KeyW) playerY.current -= paddleSpeed;
    if (globalKeys.ArrowDown || globalKeys.KeyS) playerY.current += paddleSpeed;
    aiY.current += (ball.current.y - (aiY.current + paddleH / 2)) * 0.08;
    aiY.current = Math.max(0, Math.min(h - paddleH, aiY.current));
    playerY.current = Math.max(0, Math.min(h - paddleH, playerY.current));
    ball.current.x += ball.current.vx * dt;
    ball.current.y += ball.current.vy * dt;
    if (ball.current.y <= 8 || ball.current.y >= h - 8) ball.current.vy *= -1;
    if (ball.current.x <= 26 && ball.current.y >= playerY.current && ball.current.y <= playerY.current + paddleH) ball.current.vx = Math.abs(ball.current.vx) * 1.02;
    if (ball.current.x >= w - 26 && ball.current.y >= aiY.current && ball.current.y <= aiY.current + paddleH) ball.current.vx = -Math.abs(ball.current.vx) * 1.02;
    if (ball.current.x < -8) {
      setScore((s) => ({ ...s, ai: s.ai + 1 }));
      resetRound(1);
    }
    if (ball.current.x > w + 8) {
      setScore((s) => ({ ...s, you: s.you + 1 }));
      resetRound(-1);
    }
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(14, playerY.current, paddleW, paddleH);
    ctx.fillRect(w - 24, aiY.current, paddleW, paddleH);
    ctx.beginPath();
    ctx.arc(ball.current.x, ball.current.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = UI_ACCENT;
    ctx.textAlign = "center";
    ctx.font = "bold 22px ui-monospace, Menlo, Consolas, monospace";
    ctx.fillText(`${score.you} : ${score.ai}`, w / 2, 30);
  }, true);

  return (
    <GameShell
      title="Pong"
      subtitle="Drag to move paddle"
      onExit={onExit}
      footer={
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <p className="flex-1 text-sm text-cyan-100">You {score.you} - {score.ai} AI</p>
            <button type="button" onClick={restart} className={TOUCH_ACTION_BTN}>Restart</button>
          </div>
        </div>
      }
    >
      <div ref={containerRef} className="h-full w-full" onTouchStart={(e) => {
        const t = e.touches[0];
        if (!t) return;
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ratio = canvas.height / Math.max(1, rect.height);
        playerY.current = (t.clientY - rect.top) * ratio - canvas.height * 0.09;
      }} onTouchMove={(e) => {
        const t = e.touches[0];
        if (!t) return;
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ratio = canvas.height / Math.max(1, rect.height);
        playerY.current = (t.clientY - rect.top) * ratio - canvas.height * 0.09;
        e.preventDefault();
      }}><canvas ref={canvasRef} className="h-full w-full touch-none" /></div>
    </GameShell>
  );
}
function BreakoutGame({ onExit }: { onExit: () => void }) {
  type Brick = { x: number; y: number; w: number; h: number; alive: boolean };
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paddleX = useRef(120);
  const ball = useRef({ x: 160, y: 300, vx: 180 * GLOBAL_SPEED, vy: -180 * GLOBAL_SPEED });
  const bricks = useRef<Brick[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [over, setOver] = useState(false);
  const [level, setLevel] = useState(1);
  const [awaitingNextLevel, setAwaitingNextLevel] = useState(false);
  const levelStartedAtRef = useRef<number>(Date.now());
  const diffStatsRef = useRef<LinearDifficultyStats>({ wins: 0, failures: 0, avgWinSeconds: 16 });
  const learnerRef = useRef<LinearDifficultyLearner>(createLinearDifficultyLearner());
  const difficultyScaleRef = useRef<number>(1);

  useCanvasResize(containerRef, canvasRef);

  const spawn = useCallback((w: number, nextLevel: number, difficulty: number) => {
    const rows = Math.min(5 + Math.floor((nextLevel - 1) * (0.8 + difficulty * 0.45)), 9);
    const cols = 8;
    const gap = 6;
    const bw = Math.floor((w - 40 - gap * (cols - 1)) / cols);
    const bh = 14;
    const next: Brick[] = [];
    for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) next.push({ x: 20 + c * (bw + gap), y: 56 + r * (bh + gap), w: bw, h: bh, alive: true });
    bricks.current = next;
  }, []);

  const restart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const firstLevel = 1;
    setLevel(firstLevel);
    levelStartedAtRef.current = Date.now();
    diffStatsRef.current = { wins: 0, failures: 0, avgWinSeconds: 16 };
    learnerRef.current = createLinearDifficultyLearner();
    difficultyScaleRef.current = 1;
    paddleX.current = canvas.width * 0.4;
    ball.current = { x: canvas.width / 2, y: canvas.height * 0.72, vx: 180 * GLOBAL_SPEED, vy: -180 * GLOBAL_SPEED };
    spawn(canvas.width, firstLevel, 1);
    setScore(0);
    setLives(3);
    setOver(false);
    setAwaitingNextLevel(false);
  }, [spawn]);
  useEffect(() => { restart(); }, [restart]);

  const registerOutcome = useCallback((outcome: "win" | "fail", atLevel: number) => {
    const elapsed = Math.max(2, (Date.now() - levelStartedAtRef.current) / 1000);
    const stats = diffStatsRef.current;
    if (outcome === "win") {
      const nextWins = stats.wins + 1;
      stats.avgWinSeconds = (stats.avgWinSeconds * stats.wins + elapsed) / Math.max(1, nextWins);
      stats.wins = nextWins;
    } else {
      stats.failures += 1;
    }
    difficultyScaleRef.current = trainDifficultyModel(learnerRef.current, atLevel, stats, outcome);
  }, []);

  const nextLevel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const difficulty = difficultyScaleRef.current;
    setLevel((prev) => {
      const upcoming = prev + 1;
      const speed = (180 + (upcoming - 1) * Math.round(10 + difficulty * 10)) * GLOBAL_SPEED;
      paddleX.current = canvas.width * 0.4;
      ball.current = { x: canvas.width / 2, y: canvas.height * 0.72, vx: speed, vy: -speed };
      spawn(canvas.width, upcoming, difficulty);
      setAwaitingNextLevel(false);
      levelStartedAtRef.current = Date.now();
      return upcoming;
    });
  }, [spawn]);

  useAnimationFrame((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const paddleW = Math.max(90, Math.floor(w * 0.16));
    const paddleH = 10;
    const paddleY = h - 26;

    if (!over && !awaitingNextLevel) {
      ball.current.x += ball.current.vx * dt;
      ball.current.y += ball.current.vy * dt;
      if (ball.current.x <= 8 || ball.current.x >= w - 8) ball.current.vx *= -1;
      if (ball.current.y <= 8) ball.current.vy *= -1;
      if (ball.current.y >= paddleY - 8 && ball.current.y <= paddleY + paddleH && ball.current.x >= paddleX.current && ball.current.x <= paddleX.current + paddleW) {
        ball.current.vy = -Math.abs(ball.current.vy);
        const hit = (ball.current.x - (paddleX.current + paddleW / 2)) / (paddleW / 2);
        ball.current.vx += hit * 42;
      }
      for (const b of bricks.current) {
        if (!b.alive) continue;
        if (ball.current.x >= b.x && ball.current.x <= b.x + b.w && ball.current.y >= b.y && ball.current.y <= b.y + b.h) {
          b.alive = false;
          ball.current.vy *= -1;
          setScore((v) => v + 10);
          break;
        }
      }
      if (ball.current.y > h + 16) {
        setLives((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            setOver(true);
            registerOutcome("fail", level);
            return 0;
          }
          ball.current = { x: w / 2, y: h * 0.72, vx: 180 * GLOBAL_SPEED, vy: -180 * GLOBAL_SPEED };
          return next;
        });
      }
      if (!bricks.current.some((b) => b.alive)) {
        registerOutcome("win", level);
        setAwaitingNextLevel(true);
      }
    }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, w, h);
    for (const b of bricks.current) {
      if (!b.alive) continue;
      ctx.fillStyle = "rgba(34,211,238,0.9)";
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(paddleX.current, paddleY, paddleW, paddleH);
    ctx.beginPath();
    ctx.arc(ball.current.x, ball.current.y, 7, 0, Math.PI * 2);
    ctx.fill();
    const hudScale = Math.max(0.8, getScale(800, 600));
    ctx.fillStyle = UI_ACCENT;
    ctx.font = `600 ${Math.max(14, Math.floor(18 * hudScale))}px ui-sans-serif, system-ui`;
    ctx.fillText(`Score ${score}`, 12, 26);
    ctx.fillStyle = UI_MUTED;
    ctx.fillText(`Lives ${lives}`, 12, 50);
    ctx.fillText(`Level ${level}`, 12, 74);
    ctx.fillText(`Diff x${difficultyScaleRef.current.toFixed(2)}`, 12, 98);
    if (awaitingNextLevel) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(w * 0.18, h * 0.32, w * 0.64, 96);
      ctx.fillStyle = "#86efac";
      ctx.font = "bold 28px ui-sans-serif, system-ui";
      ctx.textAlign = "center";
      ctx.fillText("LEVEL COMPLETE", w / 2, h * 0.39);
      ctx.font = "600 14px ui-sans-serif, system-ui";
      ctx.fillText("Game paused - press Next Level", w / 2, h * 0.45);
      ctx.textAlign = "start";
    }
  }, true);

  return (
    <GameShell
      title="Breakout"
      subtitle="Drag to move paddle"
      onExit={onExit}
      footer={
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <p className="flex-1 text-sm text-cyan-100">Score {score} · Lives {lives} · Level {level}</p>
            <button type="button" onClick={awaitingNextLevel ? nextLevel : restart} className={TOUCH_ACTION_BTN}>
              {awaitingNextLevel ? "Next Level" : "Restart"}
            </button>
          </div>
        </div>
      }
    >
      <div ref={containerRef} className="h-full w-full" onTouchStart={(e) => {
        const t = e.touches[0];
        if (!t) return;
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ratio = canvas.width / Math.max(1, rect.width);
        paddleX.current = (t.clientX - rect.left) * ratio - canvas.width * 0.08;
      }} onTouchMove={(e) => {
        const t = e.touches[0];
        if (!t) return;
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ratio = canvas.width / Math.max(1, rect.width);
        paddleX.current = (t.clientX - rect.left) * ratio - canvas.width * 0.08;
        e.preventDefault();
      }}><canvas ref={canvasRef} className="h-full w-full touch-none" /></div>
    </GameShell>
  );
}

function XOGame({ onExit }: { onExit: () => void }) {
  type Mark = "X" | "O";
  type Result = Mark | "draw" | null;
  const [board, setBoard] = useState<Array<Mark | null>>(Array(9).fill(null));
  const [winner, setWinner] = useState<Result>(null);
  const [tttLevel, setTttLevel] = useState<1 | 2 | 3>(1);

  const resetTTT = () => {
    setBoard(Array(9).fill(null));
    setWinner(null);
  };

  const levelText = `Level ${tttLevel}`;
  const levelName = tttLevel === 1 ? "Easy" : tttLevel === 2 ? "Medium" : "Hard";

  useEffect(() => {
    const el = document.getElementById("tttLevelLabel");
    if (el) {
      el.textContent = `Level ${tttLevel} · ${levelName}`;
    }
  }, [levelName, tttLevel]);

  const checkWinner = (candidate: Array<Mark | null>): Result => {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a, b, c] of lines) {
      if (candidate[a] && candidate[a] === candidate[b] && candidate[a] === candidate[c]) {
        return candidate[a] as Mark;
      }
    }
    if (candidate.every(Boolean)) return "draw";
    return null;
  };

  function randomMove(candidate: Array<Mark | null>) {
    const empty = candidate
      .map((v, i) => (v === null ? i : null))
      .filter((v): v is number => v !== null);
    if (empty.length === 0) return null;
    return empty[Math.floor(Math.random() * empty.length)] ?? null;
  }

  function findWinningMove(candidate: Array<Mark | null>, mark: Mark) {
    for (let i = 0; i < candidate.length; i += 1) {
      if (candidate[i] !== null) continue;
      candidate[i] = mark;
      const result = checkWinner(candidate);
      candidate[i] = null;
      if (result === mark) return i;
    }
    return null;
  }

  function mediumMove(candidate: Array<Mark | null>) {
    const win = findWinningMove(candidate, "O");
    if (win !== null) return win;
    const block = findWinningMove(candidate, "X");
    if (block !== null) return block;
    return randomMove(candidate);
  }

  function minimax(candidate: Array<Mark | null>, depth: number, isMax: boolean): number {
    const result = checkWinner(candidate);
    if (result === "O") return 10 - depth;
    if (result === "X") return depth - 10;
    if (result === "draw") return 0;

    if (isMax) {
      let best = -Infinity;
      for (let i = 0; i < candidate.length; i += 1) {
        if (candidate[i] !== null) continue;
        candidate[i] = "O";
        best = Math.max(best, minimax(candidate, depth + 1, false));
        candidate[i] = null;
      }
      return best;
    }

    let best = Infinity;
    for (let i = 0; i < candidate.length; i += 1) {
      if (candidate[i] !== null) continue;
      candidate[i] = "X";
      best = Math.min(best, minimax(candidate, depth + 1, true));
      candidate[i] = null;
    }
    return best;
  }

  function minimaxMove(candidate: Array<Mark | null>) {
    let bestScore = -Infinity;
    let move: number | null = null;
    for (let i = 0; i < candidate.length; i += 1) {
      if (candidate[i] !== null) continue;
      candidate[i] = "O";
      const score = minimax(candidate, 0, false);
      candidate[i] = null;
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
    return move;
  }

  function aiMove(candidate: Array<Mark | null>) {
    if (tttLevel === 1) return randomMove(candidate);
    if (tttLevel === 2) return mediumMove(candidate);
    return minimaxMove(candidate);
  }

  const onPlayerWin = () => {
    setTttLevel((prev) => {
      const next = prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev;
      return next;
    });
    resetTTT();
  };

  const restart = () => {
    resetTTT();
  };

  const play = (i: number) => {
    if (winner || board[i]) return;
    const next = [...board];
    next[i] = "X";
    const first = checkWinner(next);
    if (first === "X") {
      onPlayerWin();
      return;
    }
    if (first) {
      setBoard(next);
      setWinner(first);
      return;
    }

    const aiIndex = aiMove(next);
    if (aiIndex === null) {
      setBoard(next);
      setWinner("draw");
      return;
    }

    next[aiIndex] = "O";
    const second = checkWinner(next);
    setBoard(next);
    if (second) setWinner(second);
  };

  return (
    <GameShell
      title="Tic-Tac-Toe"
      subtitle="You are X"
      headerMeta={
        <div id="tttLevelLabel" className="text-[10px] uppercase tracking-[0.12em] text-cyan-200/90">
          {levelText} · {levelName}
        </div>
      }
      onExit={onExit}
      footer={
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <p className="flex-1 text-sm text-cyan-100">{winner === "draw" ? "Draw" : winner ? `${winner} wins` : "Your move"}</p>
            <button type="button" onClick={restart} className={TOUCH_ACTION_BTN}>Restart</button>
          </div>
        </div>
      }
    >
      <div className="grid h-full place-items-center bg-[#020617] p-4"><div className="grid w-full max-w-[420px] grid-cols-3 gap-3">{board.map((cell, idx) => (<button key={idx} type="button" onClick={() => play(idx)} className="aspect-square rounded-2xl border border-cyan-300/35 bg-slate-900/75 text-4xl font-bold text-cyan-100">{cell}</button>))}</div></div>
    </GameShell>
  );
}
function MemoryGame({ onExit }: { onExit: () => void }) {
  type Card = { id: number; value: string; open: boolean; matched: boolean };

  const buildCards = useCallback((): Card[] => {
    return [...MEMORY_SYMBOLS, ...MEMORY_SYMBOLS].sort(() => Math.random() - 0.5).map((value, id) => ({ id, value, open: false, matched: false }));
  }, []);

  const [cards, setCards] = useState<Card[]>(() => buildCards());
  const [open, setOpen] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const matchedCount = cards.filter((c) => c.matched).length;
  const won = matchedCount === cards.length;

  useEffect(() => {
    if (open.length !== 2) return;
    const [a, b] = open;
    const cardA = cards[a];
    const cardB = cards[b];
    if (!cardA || !cardB) return;

    if (cardA.value === cardB.value) {
      setCards((prev) => prev.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c)));
      setOpen([]);
      return;
    }

    const t = window.setTimeout(() => {
      setCards((prev) => prev.map((c, i) => (i === a || i === b ? { ...c, open: false } : c)));
      setOpen([]);
    }, 520);
    return () => window.clearTimeout(t);
  }, [cards, open]);

  const flip = (idx: number) => {
    if (open.length >= 2) return;
    const card = cards[idx];
    if (!card || card.open || card.matched) return;
    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, open: true } : c)));
    setOpen((prev) => [...prev, idx]);
    setMoves((m) => m + 1);
  };

  const restart = () => {
    setCards(buildCards());
    setOpen([]);
    setMoves(0);
  };

  return (
    <GameShell
      title="Memory Match"
      subtitle="Find all pairs"
      onExit={onExit}
      footer={
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <p className="flex-1 text-sm text-cyan-100">Moves: {moves} {won ? "· Complete" : ""}</p>
            <button type="button" onClick={restart} className={TOUCH_ACTION_BTN}>Restart</button>
          </div>
        </div>
      }
    >
      <div className="grid h-full place-items-center bg-[#020617] p-4"><div className="grid w-full max-w-[520px] grid-cols-4 gap-3">{cards.map((card, idx) => (<button key={card.id} type="button" onClick={() => flip(idx)} className={`aspect-square rounded-xl border text-lg font-semibold transition ${card.open || card.matched ? "border-cyan-300/60 bg-cyan-400/15 text-cyan-100" : "border-slate-500/30 bg-slate-900/70 text-slate-300"}`}>{card.open || card.matched ? card.value : "?"}</button>))}</div></div>
    </GameShell>
  );
}

export function PXPlayClient() {
  const [active, setActive] = useState<GameId | null>(null);

  const view = useMemo(() => {
    if (active === "snake") return <SnakeGame onExit={() => setActive(null)} />;
    if (active === "lander") return <LanderGame onExit={() => setActive(null)} />;
    if (active === "pong") return <PongGame onExit={() => setActive(null)} />;
    if (active === "breakout") return <BreakoutGame onExit={() => setActive(null)} />;
    if (active === "xo") return <XOGame onExit={() => setActive(null)} />;
    if (active === "memory") return <MemoryGame onExit={() => setActive(null)} />;
    return null;
  }, [active]);

  return (
    <div className="px-shell space-y-6 pb-12">
      <section className="px-panel p-4 sm:p-8">
        <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-300"><Gamepad2 className="h-4 w-4" />PX Play Arcade</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white sm:text-4xl">PX Play</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">All arcade games rebuilt from scratch with clean rendering and mobile-first controls.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {TILES.map((tile) => {
          const Icon = tile.icon;
          const selected = active === tile.id;
          return (
            <article key={tile.id} className="px-panel px-hover-lift relative overflow-hidden p-5">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-400/12 via-blue-500/10 to-transparent opacity-60" />
              <Icon className="relative h-5 w-5 text-cyan-300" />
              <h2 className="relative mt-3 text-lg font-semibold text-slate-900 dark:text-white">{tile.name}</h2>
              <p className="relative mt-1 text-sm text-slate-600 dark:text-slate-300">{tile.subtitle}</p>
              <button type="button" onClick={() => setActive(tile.id)} className="px-button relative mt-4 w-full">
                {selected ? "Playing" : "Play"}
              </button>
            </article>
          );
        })}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/ai-playground" className="px-button-ghost inline-flex">Back to AI Playground</Link>
        <Link href="/dashboard" className="px-button-ghost inline-flex">Back to Dashboard</Link>
      </div>

      {view}
    </div>
  );
}

