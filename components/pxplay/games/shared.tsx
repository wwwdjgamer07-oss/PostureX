"use client";

import { useEffect, useRef, type ReactNode } from "react";

export const MAX_DPR = 3;
export const GLOBAL_SPEED = 1.6;
export const GAME_HEADER_HEIGHT = 48;
export const GAME_FOOTER_SAFE_HEIGHT = 110;

export const UI_TEXT = "#EAF6FF";
export const UI_ACCENT = "#7FDBFF";
export const UI_MUTED = "#A9C7D9";

export const TOUCH_BTN_BASE =
  "rounded-xl border border-cyan-300/45 bg-cyan-400/10 py-3 text-sm font-semibold text-cyan-100 backdrop-blur-md active:bg-cyan-400/25";
export const TOUCH_BTN_SUBTLE =
  "rounded-xl border border-cyan-300/45 bg-slate-900/35 py-3 text-sm font-semibold text-cyan-100 backdrop-blur-md active:bg-cyan-400/20";
export const TOUCH_ACTION_BTN =
  "rounded-xl border border-cyan-300/45 bg-cyan-400/12 px-4 py-2 text-sm text-cyan-100 backdrop-blur-md active:bg-cyan-400/24";

export type LinearDifficultyStats = {
  wins: number;
  failures: number;
  avgWinSeconds: number;
};

export type LinearDifficultyLearner = {
  weights: [number, number, number, number, number];
  lr: number;
};

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getScale(baseW: number, baseH: number) {
  if (typeof window === "undefined") return 1;
  return Math.min(window.innerWidth / baseW, window.innerHeight / baseH);
}

export function createLinearDifficultyLearner(): LinearDifficultyLearner {
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

export function trainDifficultyModel(
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

export function useAnimationFrame(loop: (dt: number) => void, enabled: boolean) {
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

export function resizeCanvas(canvas: HTMLCanvasElement, baseW: number, baseH: number, availableW: number, availableH: number) {
  const safeW = Math.max(1, availableW);
  const safeH = Math.max(1, availableH);
  const scale = Math.min(safeW / baseW, safeH / baseH);
  const renderW = Math.max(1, Math.floor(baseW * scale));
  const renderH = Math.max(1, Math.floor(baseH * scale));
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

  canvas.style.width = `${renderW}px`;
  canvas.style.height = `${renderH}px`;
  canvas.width = Math.max(1, Math.floor(baseW * dpr));
  canvas.height = Math.max(1, Math.floor(baseH * dpr));

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  return { scale, dpr, renderW, renderH };
}

export function useCanvasResize(
  containerRef: React.RefObject<HTMLDivElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  baseW: number,
  baseH: number,
  reserveBottom = 0
) {
  const lastRenderRef = useRef({ width: baseW, height: baseH, scale: 1, dpr: 1 });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const availableW = Math.max(1, Math.min(window.innerWidth, rect.width || container.clientWidth || window.innerWidth));
      const viewportAvailableH = Math.max(1, window.innerHeight - GAME_HEADER_HEIGHT - reserveBottom);
      const availableH = Math.max(1, Math.min(viewportAvailableH, rect.height || container.clientHeight || viewportAvailableH));

      const next = resizeCanvas(canvas, baseW, baseH, availableW, availableH);
      lastRenderRef.current = {
        width: next.renderW,
        height: next.renderH,
        scale: next.scale,
        dpr: next.dpr
      };
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
  }, [baseH, baseW, canvasRef, containerRef, reserveBottom]);

  return lastRenderRef;
}

export function GameShell({
  title,
  subtitle,
  headerMeta,
  onExit,
  children,
  footer
}: {
  title: string;
  subtitle: string;
  headerMeta?: ReactNode;
  onExit: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div data-px-game-active="true" className="fixed inset-0 z-50 flex min-h-[100dvh] flex-col bg-[#020617] text-white [--header-h:48px]">
      <header className="flex h-12 items-center justify-between border-b border-cyan-400/20 bg-black/30 px-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-100">{title}</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{subtitle}</p>
          {headerMeta}
        </div>
        <button type="button" onClick={onExit} className="rounded-md border border-cyan-300/45 bg-slate-900/70 px-3 py-1 text-xs text-cyan-100">Exit</button>
      </header>
      <div className={`game-container relative min-h-0 flex-1 ${footer ? "pb-[calc(env(safe-area-inset-bottom)+6.5rem)] sm:pb-24" : ""}`}>
        <div className="relative z-10 flex h-full w-full items-center justify-center overflow-hidden">{children}</div>
        {footer ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3 pb-[env(safe-area-inset-bottom)]">
            <div className="pointer-events-auto rounded-2xl border border-cyan-300/25 bg-slate-900/25 p-2 backdrop-blur-xl">{footer}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
