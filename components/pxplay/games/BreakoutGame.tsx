"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GAME_FOOTER_SAFE_HEIGHT,
  GameShell,
  LinearDifficultyLearner,
  LinearDifficultyStats,
  TOUCH_ACTION_BTN,
  UI_ACCENT,
  UI_MUTED,
  clampNumber,
  createLinearDifficultyLearner,
  getScale,
  trainDifficultyModel,
  useAnimationFrame,
  useCanvasResize
} from "@/components/pxplay/games/shared";

export function BreakoutGame({ onExit }: { onExit: () => void }) {
  const W = 960;
  const H = 600;
  const BALL_SPEED = 6;
  type Brick = { x: number; y: number; w: number; h: number; alive: boolean };
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paddleX = useRef(W * 0.5 - 70);
  const ball = useRef({ x: W * 0.5, y: H * 0.72, vx: BALL_SPEED, vy: -BALL_SPEED });
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

  useCanvasResize(containerRef, canvasRef, W, H, GAME_FOOTER_SAFE_HEIGHT);

  const spawn = useCallback((nextLevel: number, difficulty: number) => {
    const rows = Math.min(5 + Math.floor((nextLevel - 1) * (0.8 + difficulty * 0.45)), 9);
    const cols = 8;
    const gap = 8;
    const bw = Math.floor((W - 40 - gap * (cols - 1)) / cols);
    const bh = 18;
    const next: Brick[] = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        next.push({ x: 20 + c * (bw + gap), y: 56 + r * (bh + gap), w: bw, h: bh, alive: true });
      }
    }
    bricks.current = next;
  }, []);

  const clampPaddle = useCallback((x: number) => {
    const paddleW = Math.max(108, Math.floor(W * 0.16));
    return clampNumber(x, 0, W - paddleW);
  }, []);

  const setPaddleFromClientX = useCallback((clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const paddleW = Math.max(108, Math.floor(W * 0.16));
    const logicalX = ((clientX - rect.left) / rect.width) * W - paddleW / 2;
    paddleX.current = clampPaddle(logicalX);
  }, [clampPaddle]);

  const restart = useCallback(() => {
    const firstLevel = 1;
    setLevel(firstLevel);
    levelStartedAtRef.current = Date.now();
    diffStatsRef.current = { wins: 0, failures: 0, avgWinSeconds: 16 };
    learnerRef.current = createLinearDifficultyLearner();
    difficultyScaleRef.current = 1;
    paddleX.current = W * 0.5 - Math.floor(W * 0.08);
    ball.current = { x: W / 2, y: H * 0.72, vx: BALL_SPEED, vy: -BALL_SPEED };
    spawn(firstLevel, 1);
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
    const difficulty = difficultyScaleRef.current;
    setLevel((prev) => {
      const upcoming = prev + 1;
      const speed = BALL_SPEED + (upcoming - 1) * (0.35 + difficulty * 0.25);
      paddleX.current = W * 0.5 - Math.floor(W * 0.08);
      ball.current = { x: W / 2, y: H * 0.72, vx: speed, vy: -speed };
      spawn(upcoming, difficulty);
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
    const step = dt * 60;
    const w = W;
    const h = H;
    const paddleW = Math.max(108, Math.floor(w * 0.16));
    const paddleH = 12;
    const paddleY = h - 30;
    paddleX.current = clampPaddle(paddleX.current);

    if (!over && !awaitingNextLevel) {
      ball.current.x += ball.current.vx * step;
      ball.current.y += ball.current.vy * step;
      if (ball.current.x <= 8 || ball.current.x >= w - 8) ball.current.vx *= -1;
      if (ball.current.y <= 8) ball.current.vy *= -1;
      if (ball.current.y >= paddleY - 8 && ball.current.y <= paddleY + paddleH && ball.current.x >= paddleX.current && ball.current.x <= paddleX.current + paddleW) {
        ball.current.vy = -Math.abs(ball.current.vy);
        const hit = (ball.current.x - (paddleX.current + paddleW / 2)) / (paddleW / 2);
        ball.current.vx += hit * 0.8;
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
          ball.current = { x: w / 2, y: h * 0.72, vx: BALL_SPEED, vy: -BALL_SPEED };
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
            {awaitingNextLevel || over ? (
              <button type="button" onClick={awaitingNextLevel ? nextLevel : restart} className={TOUCH_ACTION_BTN}>
                {awaitingNextLevel ? "Next Level" : "Restart"}
              </button>
            ) : null}
          </div>
        </div>
      }
    >
      <div
        ref={containerRef}
        className="relative flex h-full w-full items-center justify-center"
        onMouseMove={(e) => {
          setPaddleFromClientX(e.clientX);
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (!t) return;
          setPaddleFromClientX(t.clientX);
          e.preventDefault();
        }}
      >
        <canvas
          ref={canvasRef}
          className="block max-h-full max-w-full touch-none"
          onTouchMove={(e) => {
            const t = e.touches[0];
            if (!t) return;
            setPaddleFromClientX(t.clientX);
            e.preventDefault();
          }}
        />
      </div>
    </GameShell>
  );
}
