"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GAME_FOOTER_SAFE_HEIGHT,
  GameShell,
  LinearDifficultyLearner,
  LinearDifficultyStats,
  TOUCH_BTN_BASE,
  TOUCH_BTN_SUBTLE,
  UI_ACCENT,
  UI_MUTED,
  UI_TEXT,
  createLinearDifficultyLearner,
  getScale,
  trainDifficultyModel,
  useAnimationFrame,
  useCanvasResize
} from "@/components/pxplay/games/shared";

export function LanderGame({ onExit }: { onExit: () => void }) {
  const W = 960;
  const H = 640;
  const GRAVITY = 0.04;
  const THRUST = 0.09;
  const ROT_SPEED = 0.05;
  const DRAG = 0.995;
  const FUEL_BURN = 0.25;
  const MAX_SAFE_VY = 1.9;
  const MAX_SAFE_ANGLE = 20;
  const PAD_WIDTH = 120;
  const PAD_HEIGHT = 8;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const leftRef = useRef(false);
  const rightRef = useRef(false);
  const thrustRef = useRef(false);
  const shipRef = useRef({ x: W * 0.2, y: H * 0.2, vx: 0, vy: 0, a: -Math.PI / 2 });
  const terrainRef = useRef<Array<{ x: number; y: number }>>([]);
  const padRef = useRef({ x: 0, w: PAD_WIDTH, y: 0 });
  const thrustPowerRef = useRef(0);
  const [fuel, setFuel] = useState(320);
  const [state, setState] = useState<"running" | "won" | "crashed">("running");
  const [level, setLevel] = useState(1);
  const levelStartedAtRef = useRef<number>(Date.now());
  const diffStatsRef = useRef<LinearDifficultyStats>({ wins: 0, failures: 0, avgWinSeconds: 20 });
  const learnerRef = useRef<LinearDifficultyLearner>(createLinearDifficultyLearner());
  const difficultyScaleRef = useRef<number>(1);

  useCanvasResize(containerRef, canvasRef, W, H, GAME_FOOTER_SAFE_HEIGHT);

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
    shipRef.current = { x: W * 0.2, y: H * 0.2, vx: 0, vy: 0, a: -Math.PI / 2 };
    thrustPowerRef.current = 0;
    setLevel(1);
    levelStartedAtRef.current = Date.now();
    diffStatsRef.current = { wins: 0, failures: 0, avgWinSeconds: 20 };
    learnerRef.current = createLinearDifficultyLearner();
    difficultyScaleRef.current = 1;
    setFuel(360);
    setState("running");
    regenerate(W, H);
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
    const difficulty = difficultyScaleRef.current;
    setLevel((prev) => {
      const upcoming = prev + 1;
      regenerate(W, H);
      shipRef.current = { x: W * 0.2, y: H * 0.2, vx: 0, vy: 0, a: -Math.PI / 2 };
      thrustPowerRef.current = 0;
      setFuel(Math.max(220, Math.round(360 - (upcoming - 1) * (6 + difficulty * 4))));
      setState("running");
      levelStartedAtRef.current = Date.now();
      return upcoming;
    });
  }, [regenerate]);

  useEffect(() => { restart(); }, [restart]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") leftRef.current = true;
      if (k === "arrowright" || k === "d") rightRef.current = true;
      if (k === "arrowup" || k === "w" || k === " ") thrustRef.current = true;
      if (k === "r") restart();
      if (k === "arrowleft" || k === "arrowright" || k === "arrowup" || k === " ") {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowleft" || k === "a") leftRef.current = false;
      if (k === "arrowright" || k === "d") rightRef.current = false;
      if (k === "arrowup" || k === "w" || k === " ") thrustRef.current = false;
    };
    const blur = () => {
      leftRef.current = false;
      rightRef.current = false;
      thrustRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
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
    const w = W;
    const h = H;
    if (!terrainRef.current.length) regenerate(W, H);

    if (state === "running") {
      const step = dt * 60;
      const rotatingLeft = leftRef.current;
      const rotatingRight = rightRef.current;
      const thrusting = thrustRef.current && fuel > 0;

      if (rotatingLeft) shipRef.current.a -= ROT_SPEED * step;
      if (rotatingRight) shipRef.current.a += ROT_SPEED * step;
      if (!rotatingLeft && !rotatingRight) {
        shipRef.current.a += (-Math.PI / 2 - shipRef.current.a) * 0.02 * step;
      }

      if (thrusting) {
        thrustPowerRef.current = Math.min(1, thrustPowerRef.current + 0.14 * step);
      } else {
        thrustPowerRef.current *= Math.pow(0.84, step);
      }

      if (thrusting) {
        setFuel((f) => Math.max(0, f - FUEL_BURN * step));
        shipRef.current.vx += Math.cos(shipRef.current.a) * THRUST * step;
        shipRef.current.vy += Math.sin(shipRef.current.a) * THRUST * step;
      }

      shipRef.current.vy += GRAVITY * step;
      shipRef.current.vx *= Math.pow(DRAG, step);
      shipRef.current.vy *= Math.pow(DRAG, step);
      shipRef.current.x += shipRef.current.vx * step;
      shipRef.current.y += shipRef.current.vy * step;
      shipRef.current.x = Math.max(10, Math.min(w - 10, shipRef.current.x));
      shipRef.current.y = Math.max(8, shipRef.current.y);

      const groundY = terrainY(shipRef.current.x);
      const shipBottom = shipRef.current.y + 8;
      const padTop = padRef.current.y - PAD_HEIGHT / 2;
      const padLeft = padRef.current.x;
      const padRight = padRef.current.x + padRef.current.w;
      const normalizedUpright = Math.atan2(
        Math.sin(shipRef.current.a + Math.PI / 2),
        Math.cos(shipRef.current.a + Math.PI / 2)
      );
      const angleDeg = Math.abs((normalizedUpright * 180) / Math.PI);
      const canLand =
        Math.abs(shipRef.current.vy) < MAX_SAFE_VY &&
        Math.abs(shipRef.current.vx) < 1.8 &&
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
    ctx.fillStyle = "#020617";
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
    ctx.rotate(shipRef.current.a + Math.PI / 2);
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
      const plume = 14 + Math.random() * 8 + thrustPowerRef.current * 6;
      ctx.moveTo(-3, 8);
      ctx.lineTo(0, plume);
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
    ctx.fillText("Easy Assist", 14, 68);
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
      ctx.textAlign = "start";
    }
  }, true);

  return (
    <GameShell
      title="Lunar Lander"
      subtitle="Hold left / thrust / right"
      onExit={onExit}
    >
      <div ref={containerRef} className="relative h-full w-full pb-[calc(env(safe-area-inset-bottom)+6.75rem)]">
        <div className="absolute inset-0 flex items-center justify-center">
          <canvas ref={canvasRef} className="lander-canvas block max-h-full max-w-full" />
        </div>
        <div className="controls lander-controls">
          <button
            type="button"
            onPointerDown={() => { leftRef.current = true; }}
            onPointerUp={() => { leftRef.current = false; }}
            onPointerLeave={() => { leftRef.current = false; }}
            onPointerCancel={() => { leftRef.current = false; }}
            className={TOUCH_BTN_SUBTLE}
          >
            Left
          </button>
          <button
            type="button"
            onPointerDown={() => { thrustRef.current = true; }}
            onPointerUp={() => { thrustRef.current = false; }}
            onPointerLeave={() => { thrustRef.current = false; }}
            onPointerCancel={() => { thrustRef.current = false; }}
            className={TOUCH_BTN_BASE}
          >
            Thrust
          </button>
          <button
            type="button"
            onPointerDown={() => { rightRef.current = true; }}
            onPointerUp={() => { rightRef.current = false; }}
            onPointerLeave={() => { rightRef.current = false; }}
            onPointerCancel={() => { rightRef.current = false; }}
            className={TOUCH_BTN_SUBTLE}
          >
            Right
          </button>
          {state !== "running" ? (
            <button type="button" onClick={state === "won" ? nextLevel : restart} className={TOUCH_BTN_BASE}>
              {state === "won" ? "Next Level" : "Restart"}
            </button>
          ) : null}
        </div>
      </div>
    </GameShell>
  );
}
