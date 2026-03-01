"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PongMobileProps = {
  onExit?: () => void;
};
const UI_ACCENT = "#7FDBFF";
const UI_MUTED = "#A9C7D9";
const UI_TEXT = "#EAF6FF";

export default function PongMobile({ onExit }: PongMobileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const playerRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const aiRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const ballRef = useRef({ x: 0, y: 0, vx: 0, vy: 0, r: 8 });
  const touchActiveRef = useRef(false);
  const scoreRef = useRef({ you: 0, ai: 0 });
  const [showTutorial, setShowTutorial] = useState(false);

  const resetBall = useCallback((dir?: 1 | -1) => {
    const w = sizeRef.current.width;
    const h = sizeRef.current.height;
    if (!w || !h) return;
    const base = Math.max(4, w * 0.006);
    const horizontal = dir ?? (Math.random() > 0.5 ? 1 : -1);
    ballRef.current.x = w / 2;
    ballRef.current.y = h / 2;
    ballRef.current.vx = base * horizontal;
    ballRef.current.vy = base * (Math.random() * 2 - 1);
    ballRef.current.r = Math.max(6, w * 0.012);
  }, []);

  const resizePongCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const prevW = sizeRef.current.width || rect.width;
    const prevH = sizeRef.current.height || rect.height;
    const sx = rect.width / prevW;
    const sy = rect.height / prevH;
    sizeRef.current = { width: rect.width, height: rect.height };

    const paddleW = rect.width * 0.015;
    const paddleH = rect.height * 0.18;
    playerRef.current = {
      x: rect.width * 0.04,
      y: Math.max(0, Math.min(rect.height - paddleH, playerRef.current.y * sy || rect.height / 2 - paddleH / 2)),
      w: paddleW,
      h: paddleH
    };
    aiRef.current = {
      x: rect.width * 0.96 - paddleW,
      y: Math.max(0, Math.min(rect.height - paddleH, aiRef.current.y * sy || rect.height / 2 - paddleH / 2)),
      w: paddleW,
      h: paddleH
    };
    ballRef.current.x = ballRef.current.x * sx || rect.width / 2;
    ballRef.current.y = ballRef.current.y * sy || rect.height / 2;
    ballRef.current.r = Math.max(6, rect.width * 0.012);
    if (ballRef.current.vx === 0 && ballRef.current.vy === 0) {
      resetBall();
    }
  }, [resetBall]);

  const restart = () => {
    scoreRef.current = { you: 0, ai: 0 };
    resetBall();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.touchAction = "none";

    const onResize = () => resizePongCanvas();
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [resizePongCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (event: globalThis.TouchEvent) => {
      if (event.touches.length === 0) return;
      touchActiveRef.current = true;
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const y = event.touches[0].clientY - rect.top;
      playerRef.current.y = y - playerRef.current.h / 2;
    };

    const onTouchMove = (event: globalThis.TouchEvent) => {
      if (event.touches.length === 0) return;
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const y = event.touches[0].clientY - rect.top;
      playerRef.current.y = y - playerRef.current.h / 2;
    };

    const onTouchEnd = () => {
      touchActiveRef.current = false;
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);
    canvas.addEventListener("touchcancel", onTouchEnd);

    return () => {
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  useEffect(() => {
    const tutorialTimer = window.setTimeout(() => {
      setShowTutorial(false);
    }, 3000);
    return () => window.clearTimeout(tutorialTimer);
  }, [showTutorial]);

  useEffect(() => {
    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;

      const dt = 1 / 60;
      const w = sizeRef.current.width;
      const h = sizeRef.current.height;
      if (!w || !h) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const player = playerRef.current;
      const ai = aiRef.current;
      const ball = ballRef.current;

      ai.y += (ball.y - (ai.y + ai.h / 2)) * 0.08;
      ai.y = Math.max(0, Math.min(h - ai.h, ai.y));
      player.y = Math.max(0, Math.min(h - player.h, player.y));

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.y <= ball.r || ball.y >= h - ball.r) {
        ball.vy *= -1;
      }

      if (ball.x - ball.r <= player.x + player.w && ball.y >= player.y && ball.y <= player.y + player.h) {
        ball.vx = Math.abs(ball.vx);
      }

      if (ball.x + ball.r >= ai.x && ball.y >= ai.y && ball.y <= ai.y + ai.h) {
        ball.vx = -Math.abs(ball.vx);
      }

      if (ball.x < -ball.r) {
        const next = { ...scoreRef.current, ai: scoreRef.current.ai + 1 };
        scoreRef.current = next;
        resetBall(1);
      } else if (ball.x > w + ball.r) {
        const next = { ...scoreRef.current, you: scoreRef.current.you + 1 };
        scoreRef.current = next;
        resetBall(-1);
      }

      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, Math.max(w, h) * 0.9);
      bg.addColorStop(0, "#0b1220");
      bg.addColorStop(1, "#020617");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(34,211,238,0.24)";
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(player.x, player.y, player.w, player.h);
      ctx.fillRect(ai.x, ai.y, ai.w, ai.h);

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = UI_ACCENT;
      ctx.font = "600 18px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${scoreRef.current.you} : ${scoreRef.current.ai}`, w / 2, 28);
      ctx.fillStyle = UI_MUTED;
      ctx.font = "500 12px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText("Drag anywhere to move paddle", w / 2, 48);

      if (showTutorial) {
        ctx.fillStyle = "rgba(2, 6, 23, 0.72)";
        const boxW = Math.min(340, w * 0.88);
        const boxH = 72;
        const x = (w - boxW) / 2;
        const y = h * 0.12;
        ctx.fillRect(x, y, boxW, boxH);
        ctx.fillStyle = UI_TEXT;
        ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText("Tutorial: drag finger up/down", w / 2, y + 28);
        ctx.fillText("Beat the AI by scoring past right edge", w / 2, y + 48);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [resetBall, showTutorial]);

  return (
    <div className="pong-stage text-white">
      <canvas ref={canvasRef} className="touch-none" />
      <div className="pong-controls">
        <button type="button" onClick={restart} className="rounded-xl border border-cyan-300/40 bg-slate-900/70 px-4 py-2 text-sm text-cyan-100">
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
