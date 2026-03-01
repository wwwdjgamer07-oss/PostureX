"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GAME_FOOTER_SAFE_HEIGHT,
  GameShell,
  TOUCH_ACTION_BTN,
  UI_ACCENT,
  UI_MUTED,
  clampNumber,
  useAnimationFrame,
  useCanvasResize
} from "@/components/pxplay/games/shared";

export function PongGame({ onExit }: { onExit: () => void }) {
  const W = 960;
  const H = 540;
  const BALL_SPEED = 6 * 1.4;
  const PADDLE_SPEED = 5 * 1.6;
  const PADDLE_H = 96;
  const PADDLE_W = 14;
  const BALL_R = 8;
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const player = useRef({ y: H * 0.5 - PADDLE_H / 2, dy: 0, speed: PADDLE_SPEED, h: PADDLE_H, w: PADDLE_W });
  const aiY = useRef(H * 0.5 - PADDLE_H / 2);
  const ball = useRef({ x: W * 0.5, y: H * 0.5, vx: BALL_SPEED, vy: BALL_SPEED * 0.8 });
  const [score, setScore] = useState({ you: 0, ai: 0 });

  useCanvasResize(containerRef, canvasRef, W, H, GAME_FOOTER_SAFE_HEIGHT);

  const clampPaddle = useCallback((y: number) => {
    return clampNumber(y, 0, H - player.current.h);
  }, []);

  const setPlayerFromClientY = useCallback((clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.height) return;
    const logicalY = ((clientY - rect.top) / rect.height) * H - player.current.h / 2;
    player.current.y = clampPaddle(logicalY);
  }, [clampPaddle]);

  const resetRound = useCallback((dir: number) => {
    ball.current = {
      x: W / 2,
      y: H / 2,
      vx: BALL_SPEED * dir,
      vy: (Math.random() > 0.5 ? 1 : -1) * BALL_SPEED * 0.78
    };
  }, [BALL_SPEED]);

  const restart = useCallback(() => {
    setScore({ you: 0, ai: 0 });
    player.current = { ...player.current, y: H * 0.5 - player.current.h / 2, dy: 0 };
    aiY.current = H * 0.5 - player.current.h / 2;
    resetRound(Math.random() > 0.5 ? 1 : -1);
  }, [resetRound]);

  useEffect(() => { restart(); }, [restart]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") player.current.dy = -player.current.speed;
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") player.current.dy = player.current.speed;
      if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key.toLowerCase() === "w" || e.key.toLowerCase() === "s") {
        player.current.dy = 0;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useAnimationFrame((dt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const step = dt * 60;
    const w = W;
    const h = H;
    const paddleInset = 20;
    player.current.y = clampPaddle(player.current.y + player.current.dy * step);
    aiY.current += (ball.current.y - (aiY.current + player.current.h / 2)) * 0.1 * step;
    aiY.current = clampNumber(aiY.current, 0, h - player.current.h);

    ball.current.x += ball.current.vx * step;
    ball.current.y += ball.current.vy * step;

    if (ball.current.y <= BALL_R || ball.current.y >= h - BALL_R) {
      ball.current.vy *= -1;
      ball.current.y = clampNumber(ball.current.y, BALL_R, h - BALL_R);
    }

    if (
      ball.current.x - BALL_R <= paddleInset + player.current.w &&
      ball.current.x + BALL_R >= paddleInset &&
      ball.current.y >= player.current.y &&
      ball.current.y <= player.current.y + player.current.h
    ) {
      const impact = (ball.current.y - (player.current.y + player.current.h / 2)) / (player.current.h / 2);
      ball.current.vx = Math.abs(ball.current.vx) * 1.03;
      ball.current.vy += impact * 0.7;
    }

    if (
      ball.current.x + BALL_R >= w - paddleInset - player.current.w &&
      ball.current.x - BALL_R <= w - paddleInset &&
      ball.current.y >= aiY.current &&
      ball.current.y <= aiY.current + player.current.h
    ) {
      const impact = (ball.current.y - (aiY.current + player.current.h / 2)) / (player.current.h / 2);
      ball.current.vx = -Math.abs(ball.current.vx) * 1.03;
      ball.current.vy += impact * 0.7;
    }

    if (ball.current.x < -BALL_R) {
      setScore((s) => ({ ...s, ai: s.ai + 1 }));
      resetRound(1);
    }
    if (ball.current.x > w + BALL_R) {
      setScore((s) => ({ ...s, you: s.you + 1 }));
      resetRound(-1);
    }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(34,211,238,0.24)";
    ctx.setLineDash([12, 12]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#22d3ee";
    ctx.fillRect(paddleInset, player.current.y, player.current.w, player.current.h);
    ctx.fillRect(w - paddleInset - player.current.w, aiY.current, player.current.w, player.current.h);
    ctx.beginPath();
    ctx.arc(ball.current.x, ball.current.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = UI_ACCENT;
    ctx.textAlign = "center";
    ctx.font = "bold 22px ui-monospace, Menlo, Consolas, monospace";
    ctx.fillText(`${score.you} : ${score.ai}`, w / 2, 30);
    ctx.fillStyle = UI_MUTED;
    ctx.font = "600 13px ui-sans-serif, system-ui";
    ctx.fillText("Arrow Up/Down or drag paddle", w / 2, 52);
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
            {score.you > 0 || score.ai > 0 ? (
              <button type="button" onClick={restart} className={TOUCH_ACTION_BTN}>Restart</button>
            ) : null}
          </div>
        </div>
      }
    >
      <div
        ref={containerRef}
        className="relative flex h-full w-full items-center justify-center"
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (!t) return;
          setPlayerFromClientY(t.clientY);
          e.preventDefault();
        }}
        onPointerMove={(e) => {
          if (e.pointerType === "mouse" && e.buttons === 0) return;
          setPlayerFromClientY(e.clientY);
        }}
      >
        <canvas
          ref={canvasRef}
          className="block max-h-full max-w-full touch-none"
          onTouchMove={(e) => {
            const t = e.touches[0];
            if (!t) return;
            setPlayerFromClientY(t.clientY);
            e.preventDefault();
          }}
        />
      </div>
    </GameShell>
  );
}
