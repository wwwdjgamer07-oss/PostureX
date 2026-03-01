"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type BreakoutMobileProps = {
  onExit?: () => void;
};

type Brick = { x: number; y: number; w: number; h: number; alive: boolean };
type BallState = { x: number; y: number; vx: number; vy: number; radius: number };
type CanvasMetrics = {
  width: number;
  height: number;
  dpr: number;
  paddleWidth: number;
  paddleHeight: number;
  paddleY: number;
  ballRadius: number;
  brickRows: number;
  brickCols: number;
  brickWidth: number;
  brickHeight: number;
  brickOffsetTop: number;
};

const UI_TEXT = "#EAF6FF";
const UI_ACCENT = "#7FDBFF";
const UI_MUTED = "#A9C7D9";

export default function BreakoutMobile({ onExit }: BreakoutMobileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const paddleXRef = useRef(0);
  const paddleTargetXRef = useRef(0);
  const ballRef = useRef<BallState>({ x: 0, y: 0, vx: 0, vy: 0, radius: 0 });
  const bricksRef = useRef<Brick[]>([]);
  const scoreRef = useRef(0);
  const lastFrameRef = useRef<number>(0);
  const [showTutorial, setShowTutorial] = useState(false);

  const getMetrics = useCallback((): CanvasMetrics => {
    const width = sizeRef.current.width;
    const height = sizeRef.current.height;
    const paddleWidth = width * 0.22;
    const paddleHeight = height * 0.018;
    const paddleY = height * 0.92;
    const ballRadius = Math.max(6, width * 0.012);
    const brickRows = 6;
    const brickCols = 8;
    const brickWidth = width / brickCols;
    const brickHeight = height * 0.035;
    const brickOffsetTop = height * 0.08;
    return {
      width,
      height,
      dpr: sizeRef.current.dpr,
      paddleWidth,
      paddleHeight,
      paddleY,
      ballRadius,
      brickRows,
      brickCols,
      brickWidth,
      brickHeight,
      brickOffsetTop
    };
  }, []);

  const getBaseSpeed = useCallback((width: number) => Math.max(4, width * 0.006), []);

  const createBricks = useCallback((metrics: CanvasMetrics) => {
    const items: Brick[] = [];
    for (let row = 0; row < metrics.brickRows; row += 1) {
      for (let col = 0; col < metrics.brickCols; col += 1) {
        items.push({
          x: col * metrics.brickWidth,
          y: metrics.brickOffsetTop + row * metrics.brickHeight,
          w: metrics.brickWidth,
          h: metrics.brickHeight,
          alive: true
        });
      }
    }
    return items;
  }, []);

  const resetBall = useCallback((direction?: number) => {
    const metrics = getMetrics();
    const baseSpeed = getBaseSpeed(metrics.width);
    let vxSeed = direction ?? (Math.random() * 2 - 1);
    if (Math.abs(vxSeed) < 0.25) vxSeed = vxSeed < 0 ? -0.6 : 0.6;

    ballRef.current = {
      radius: metrics.ballRadius,
      x: metrics.width / 2,
      y: metrics.height * 0.6,
      vx: baseSpeed * vxSeed,
      vy: -baseSpeed
    };
  }, [getBaseSpeed, getMetrics]);

  const resetLayoutState = useCallback(() => {
    const metrics = getMetrics();
    if (metrics.width <= 0 || metrics.height <= 0) return;
    paddleXRef.current = (metrics.width - metrics.paddleWidth) / 2;
    paddleTargetXRef.current = paddleXRef.current;
    bricksRef.current = createBricks(metrics);
    resetBall();
  }, [createBricks, getMetrics, resetBall]);

  const restartGame = useCallback(() => {
    scoreRef.current = 0;
    lastFrameRef.current = 0;
    resetLayoutState();
  }, [resetLayoutState]);

  const clampPaddle = useCallback(() => {
    const metrics = getMetrics();
    paddleTargetXRef.current = Math.max(0, Math.min(metrics.width - metrics.paddleWidth, paddleTargetXRef.current));
    paddleXRef.current = paddleTargetXRef.current;
  }, [getMetrics]);

  const update = useCallback((deltaFactor: number) => {
    const metrics = getMetrics();
    if (metrics.width <= 0 || metrics.height <= 0) return;

    clampPaddle();

    ballRef.current.x += ballRef.current.vx * deltaFactor;
    ballRef.current.y += ballRef.current.vy * deltaFactor;

    if (ballRef.current.x < ballRef.current.radius || ballRef.current.x > metrics.width - ballRef.current.radius) {
      ballRef.current.vx *= -1;
      ballRef.current.x = Math.max(ballRef.current.radius, Math.min(metrics.width - ballRef.current.radius, ballRef.current.x));
    }

    if (ballRef.current.y < ballRef.current.radius) {
      ballRef.current.vy *= -1;
      ballRef.current.y = ballRef.current.radius;
    }

    if (
      ballRef.current.y + ballRef.current.radius >= metrics.paddleY &&
      ballRef.current.y - ballRef.current.radius <= metrics.paddleY + metrics.paddleHeight &&
      ballRef.current.x >= paddleXRef.current &&
      ballRef.current.x <= paddleXRef.current + metrics.paddleWidth
    ) {
      ballRef.current.vy *= -1;
      ballRef.current.y = metrics.paddleY - ballRef.current.radius;
    }

    for (const brick of bricksRef.current) {
      if (!brick.alive) continue;
      const overlap =
        ballRef.current.x + ballRef.current.radius >= brick.x &&
        ballRef.current.x - ballRef.current.radius <= brick.x + brick.w &&
        ballRef.current.y + ballRef.current.radius >= brick.y &&
        ballRef.current.y - ballRef.current.radius <= brick.y + brick.h;
      if (!overlap) continue;

      brick.alive = false;
      ballRef.current.vy *= -1;
      scoreRef.current += 10;
      break;
    }

    if (!bricksRef.current.some((brick) => brick.alive)) {
      bricksRef.current = createBricks(metrics);
      resetBall(ballRef.current.vx >= 0 ? 1 : -1);
    }

    if (ballRef.current.y - ballRef.current.radius > metrics.height) {
      resetBall();
    }
  }, [clampPaddle, createBricks, getMetrics, resetBall]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const metrics = getMetrics();
    if (metrics.width <= 0 || metrics.height <= 0) return;

    ctx.setTransform(metrics.dpr, 0, 0, metrics.dpr, 0, 0);
    ctx.clearRect(0, 0, metrics.width, metrics.height);

    const bg = ctx.createRadialGradient(metrics.width * 0.5, metrics.height * 0.3, 0, metrics.width * 0.5, metrics.height * 0.3, Math.max(metrics.width, metrics.height));
    bg.addColorStop(0, "#0b1220");
    bg.addColorStop(1, "#020617");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, metrics.width, metrics.height);

    for (const brick of bricksRef.current) {
      if (!brick.alive) continue;
      ctx.fillStyle = "rgba(34,211,238,0.88)";
      ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
      ctx.strokeStyle = "rgba(8,47,73,0.45)";
      ctx.lineWidth = Math.max(1, metrics.height * 0.002);
      ctx.strokeRect(brick.x, brick.y, brick.w, brick.h);
    }

    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(paddleXRef.current, metrics.paddleY, metrics.paddleWidth, metrics.paddleHeight);

    ctx.beginPath();
    ctx.arc(ballRef.current.x, ballRef.current.y, ballRef.current.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = UI_ACCENT;
    ctx.font = `600 ${Math.max(14, metrics.height * 0.032)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(`Score ${scoreRef.current}`, metrics.width * 0.03, metrics.height * 0.02);

    ctx.fillStyle = UI_TEXT;
    ctx.font = `500 ${Math.max(11, metrics.height * 0.018)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillText("Drag finger to move paddle", metrics.width * 0.03, metrics.height * 0.055);

    if (showTutorial) {
      ctx.fillStyle = "rgba(2,6,23,0.72)";
      const panelW = Math.min(360, metrics.width * 0.88);
      const panelH = 86;
      const panelX = (metrics.width - panelW) / 2;
      const panelY = metrics.height * 0.18;
      ctx.fillRect(panelX, panelY, panelW, panelH);
      ctx.fillStyle = UI_TEXT;
      ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Tutorial", metrics.width / 2, panelY + 14);
      ctx.fillStyle = UI_MUTED;
      ctx.fillText("Drag anywhere left/right to move paddle.", metrics.width / 2, panelY + 38);
      ctx.fillText("Break all bricks, do not miss the ball.", metrics.width / 2, panelY + 58);
      ctx.textAlign = "start";
    }
  }, [getMetrics, showTutorial]);

  useEffect(() => {
    if (!showTutorial) return;
    const timer = window.setTimeout(() => setShowTutorial(false), 3000);
    return () => window.clearTimeout(timer);
  }, [showTutorial]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.touchAction = "none";

    const resizeBreakoutCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      sizeRef.current = { width: rect.width, height: rect.height, dpr };
      resetLayoutState();
    };

    resizeBreakoutCanvas();
    const raf = window.requestAnimationFrame(resizeBreakoutCanvas);
    window.addEventListener("resize", resizeBreakoutCanvas);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resizeBreakoutCanvas);
    };
  }, [resetLayoutState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateFromTouch = (event: globalThis.TouchEvent) => {
      if (event.touches.length === 0) return;
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = event.touches[0].clientX - rect.left;
      const metrics = getMetrics();
      const next = x - metrics.paddleWidth / 2;
      const clamped = Math.max(0, Math.min(metrics.width - metrics.paddleWidth, next));
      paddleTargetXRef.current = clamped;
      paddleXRef.current = clamped;
    };

    canvas.addEventListener("touchstart", updateFromTouch, { passive: false });
    canvas.addEventListener("touchmove", updateFromTouch, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", updateFromTouch);
      canvas.removeEventListener("touchmove", updateFromTouch);
    };
  }, [getMetrics]);

  useEffect(() => {
    const loop = (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;

      const deltaFactor = lastFrameRef.current ? Math.min(2, (time - lastFrameRef.current) / 16.6667) : 1;
      lastFrameRef.current = time;

      update(deltaFactor);
      draw(ctx);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw, update]);

  return (
    <div className="breakout-stage text-white">
      <canvas id="breakoutCanvas" ref={canvasRef} className="touch-none" />
      <div className="breakout-controls">
        <button type="button" onClick={restartGame} className="rounded-xl border border-cyan-300/40 bg-slate-900/70 px-4 py-2 text-sm text-cyan-100">
          Restart
        </button>
        <button type="button" onClick={() => setShowTutorial(true)} className="rounded-xl border border-cyan-300/40 bg-slate-900/70 px-4 py-2 text-sm text-cyan-100">
          Tutorial
        </button>
        <button type="button" onClick={onExit} className="rounded-xl border border-cyan-300/40 bg-slate-900/70 px-4 py-2 text-sm text-cyan-100">
          Exit
        </button>
      </div>
    </div>
  );
}
