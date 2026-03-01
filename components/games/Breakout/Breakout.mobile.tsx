"use client";

import { useCallback, useEffect, useRef } from "react";

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

const MAX_DPR = 3;

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

  const getMetrics = useCallback((): CanvasMetrics => {
    const width = sizeRef.current.width;
    const height = sizeRef.current.height;
    const paddleWidth = width * 0.18;
    const paddleHeight = height * 0.02;
    const paddleY = height - paddleHeight * 2;
    const ballRadius = width * 0.012;
    const brickRows = 5;
    const brickCols = 8;
    const brickWidth = width / brickCols;
    const brickHeight = height * 0.04;
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

  const resetBall = useCallback((direction = 1) => {
    const metrics = getMetrics();
    ballRef.current = {
      radius: metrics.ballRadius,
      x: metrics.width / 2,
      y: metrics.paddleY - metrics.ballRadius - 2,
      vx: metrics.width * 0.003 * direction,
      vy: -metrics.height * 0.004
    };
  }, [getMetrics]);

  const resetLayoutState = useCallback(() => {
    const metrics = getMetrics();
    if (metrics.width <= 0 || metrics.height <= 0) return;
    paddleXRef.current = (metrics.width - metrics.paddleWidth) / 2;
    paddleTargetXRef.current = paddleXRef.current;
    bricksRef.current = createBricks(metrics);
    resetBall(1);
  }, [createBricks, getMetrics, resetBall]);

  const clampPaddle = useCallback(() => {
    const metrics = getMetrics();
    paddleTargetXRef.current = Math.max(0, Math.min(metrics.width - metrics.paddleWidth, paddleTargetXRef.current));
    paddleXRef.current += (paddleTargetXRef.current - paddleXRef.current) * 0.4;
    paddleXRef.current = Math.max(0, Math.min(metrics.width - metrics.paddleWidth, paddleXRef.current));
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

    const remainingBricks = bricksRef.current.some((brick) => brick.alive);
    if (!remainingBricks) {
      bricksRef.current = createBricks(metrics);
      resetBall(ballRef.current.vx >= 0 ? 1 : -1);
    }

    if (ballRef.current.y > metrics.height) {
      resetBall(ballRef.current.vx >= 0 ? 1 : -1);
    }
  }, [clampPaddle, createBricks, getMetrics, resetBall]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const metrics = getMetrics();
    if (metrics.width <= 0 || metrics.height <= 0) return;

    ctx.setTransform(metrics.dpr, 0, 0, metrics.dpr, 0, 0);
    ctx.clearRect(0, 0, metrics.width, metrics.height);

    ctx.fillStyle = "#020617";
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

    ctx.fillStyle = "#a5f3fc";
    ctx.font = `600 ${Math.max(14, metrics.height * 0.032)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillText(`Score ${scoreRef.current}`, metrics.width * 0.03, metrics.height * 0.02);
  }, [getMetrics]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.touchAction = "none";

    const resizeBreakoutCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (width <= 0 || height <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      sizeRef.current = { width, height, dpr };
      resetLayoutState();
    };

    resizeBreakoutCanvas();
    const raf = window.requestAnimationFrame(resizeBreakoutCanvas);
    window.addEventListener("resize", resizeBreakoutCanvas);
    window.addEventListener("orientationchange", resizeBreakoutCanvas);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resizeBreakoutCanvas);
      window.removeEventListener("orientationchange", resizeBreakoutCanvas);
    };
  }, [resetLayoutState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateFromTouch = (event: globalThis.TouchEvent) => {
      if (!canvasRef.current || event.touches.length === 0) return;
      event.preventDefault();
      const rect = canvasRef.current.getBoundingClientRect();
      const touch = event.touches[0];
      const metrics = getMetrics();
      paddleTargetXRef.current = touch.clientX - rect.left - metrics.paddleWidth / 2;
      paddleTargetXRef.current = Math.max(0, Math.min(metrics.width - metrics.paddleWidth, paddleTargetXRef.current));
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

      <div className="breakout-wrap flex-1">
        <canvas id="breakoutCanvas" ref={canvasRef} className="touch-none" />
      </div>

      <div className="breakout-controls space-y-2 border-t border-cyan-400/20 bg-white/5 p-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <p className="text-xs text-cyan-100/85">Touch and drag on the arena to position the paddle.</p>
      </div>
    </div>
  );
}
