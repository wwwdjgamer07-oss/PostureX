"use client";

import { useEffect, useRef, useState } from "react";

type LunarMobileProps = {
  onExit?: () => void;
};
const MAX_DPR = 3;
const GRAVITY = 0.035;
const THRUST = 0.08;
const ROT_SPEED = 0.03;
const FUEL_BURN = 0.25;
const MAX_SAFE_VY = 1.6;
const MAX_SAFE_ANGLE = 18;
const PAD_WIDTH = 120;
const PAD_HEIGHT = 8;
const UI_TEXT = "#EAF6FF";
const UI_ACCENT = "#7FDBFF";

export default function LunarMobile({ onExit }: LunarMobileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const keysRef = useRef({ left: false, right: false, thrust: false });
  const shipRef = useRef({ x: 180, y: 120, vx: 0, vy: 0, angle: 0 });
  const thrustPowerRef = useRef(0);
  const isMobileRef = useRef(false);
  const [fuel, setFuel] = useState(280);
  const [status, setStatus] = useState<"running" | "won" | "crashed">("running");

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    canvas.style.touchAction = "none";
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
    const obs = new ResizeObserver(resize);
    obs.observe(container);
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateTouchControls = (event: globalThis.TouchEvent) => {
      if (!canvasRef.current) return;
      event.preventDefault();

      const rect = canvasRef.current.getBoundingClientRect();
      let left = false;
      let right = false;
      let thrust = false;

      for (let i = 0; i < event.touches.length; i += 1) {
        const touch = event.touches[i];
        const normalizedX = (touch.clientX - rect.left) / rect.width;
        if (normalizedX >= 0.62) {
          thrust = true;
        } else if (normalizedX < 0.31) {
          left = true;
        } else {
          right = true;
        }
      }

      keysRef.current = { left, right, thrust };
    };

    const clearTouchControls = () => {
      keysRef.current = { left: false, right: false, thrust: false };
    };

    canvas.addEventListener("touchstart", updateTouchControls, { passive: false });
    canvas.addEventListener("touchmove", updateTouchControls, { passive: false });
    canvas.addEventListener("touchend", updateTouchControls, { passive: false });
    canvas.addEventListener("touchcancel", clearTouchControls);

    return () => {
      canvas.removeEventListener("touchstart", updateTouchControls);
      canvas.removeEventListener("touchmove", updateTouchControls);
      canvas.removeEventListener("touchend", updateTouchControls);
      canvas.removeEventListener("touchcancel", clearTouchControls);
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    isMobileRef.current = /Mobi|Android/i.test(navigator.userAgent);
  }, []);

  useEffect(() => {
    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;

      const dt = 1 / 60;
      const step = dt * 60;
      const w = canvas.width;
      const h = canvas.height;
      const ground = h - 58;
      const padLeft = Math.max(16, w * 0.5 - PAD_WIDTH / 2);
      const padRight = padLeft + PAD_WIDTH;
      const padTop = ground - PAD_HEIGHT / 2;

      const rotatingLeft = keysRef.current.left;
      const rotatingRight = keysRef.current.right;
      const thrusting = keysRef.current.thrust && fuel > 0;
      if (status === "running") {
        if (rotatingLeft) shipRef.current.angle -= ROT_SPEED * step;
        if (rotatingRight) shipRef.current.angle += ROT_SPEED * step;
        if (!rotatingLeft && !rotatingRight) {
          shipRef.current.angle *= Math.pow(0.98, step);
        }

        if (thrusting) {
          thrustPowerRef.current += 0.002 * step;
        } else {
          thrustPowerRef.current *= Math.pow(0.9, step);
        }
        thrustPowerRef.current = Math.min(THRUST, Math.max(0, thrustPowerRef.current));

        let thrustPower = thrustPowerRef.current;
        if (isMobileRef.current) thrustPower *= 1.15;
        if (thrusting) {
          setFuel((f) => Math.max(0, f - FUEL_BURN * step));
        }

        shipRef.current.vx += Math.sin(shipRef.current.angle) * thrustPower * 0.45 * step;
        shipRef.current.vy += GRAVITY * step;
        shipRef.current.vy -= thrustPower * step;
        shipRef.current.x += shipRef.current.vx * step;
        shipRef.current.y += shipRef.current.vy * step;
      }

      shipRef.current.x = Math.max(10, Math.min(w - 10, shipRef.current.x));

      const shipBottom = shipRef.current.y + 10;
      const angleDeg = Math.abs((shipRef.current.angle * 180) / Math.PI);
      const success =
        Math.abs(shipRef.current.vy) < MAX_SAFE_VY &&
        Math.abs(shipRef.current.vx) < 1.2 &&
        angleDeg < MAX_SAFE_ANGLE &&
        shipBottom >= padTop &&
        shipRef.current.x > padLeft &&
        shipRef.current.x < padRight;

      if (status === "running" && shipBottom >= ground) {
        setStatus(success ? "won" : "crashed");
        shipRef.current.y = ground - 10;
        shipRef.current.vx = 0;
        shipRef.current.vy = 0;
        thrustPowerRef.current = 0;
      }

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, ground + 18);
      for (let i = 0; i <= w; i += 36) {
        ctx.lineTo(i, ground + 18 - Math.sin(i * 0.05) * 22);
      }
      ctx.stroke();
      ctx.fillStyle = "#64748b";
      ctx.fillRect(padLeft, padTop, PAD_WIDTH, PAD_HEIGHT);

      ctx.save();
      ctx.translate(shipRef.current.x, shipRef.current.y);
      ctx.rotate(shipRef.current.angle);
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(-8, 10);
      ctx.lineTo(8, 10);
      ctx.closePath();
      ctx.stroke();
      if (status === "running" && keysRef.current.thrust && fuel > 0) {
        ctx.strokeStyle = "#22d3ee";
        ctx.beginPath();
        ctx.moveTo(-4, 10);
        ctx.lineTo(0, 18 + Math.random() * 8);
        ctx.lineTo(4, 10);
        ctx.stroke();
      }
      ctx.restore();

      ctx.fillStyle = UI_TEXT;
      ctx.font = "600 16px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(`Fuel: ${Math.round(fuel)}`, 12, 24);
      ctx.fillStyle = UI_ACCENT;
      ctx.fillText(`V-Speed: ${Math.round(shipRef.current.vy)}`, 12, 44);
      if (status !== "running") {
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(w * 0.2, h * 0.22, w * 0.6, 80);
        ctx.fillStyle = status === "won" ? "#86efac" : "#fda4af";
        ctx.font = "bold 26px ui-sans-serif, system-ui";
        ctx.textAlign = "center";
        ctx.fillText(status === "won" ? "MISSION SUCCESS" : "CRASH", w / 2, h * 0.29);
        ctx.textAlign = "start";
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [fuel, status]);

  return (
    <div className="fixed inset-0 flex min-h-[100dvh] flex-col bg-[#020617] text-white">
      <div className="flex h-12 items-center justify-between border-b border-cyan-500/20 px-3">
        <span className="text-sm tracking-widest">LUNAR LANDER</span>
        <button
          type="button"
          onClick={onExit}
          className="rounded-lg border border-cyan-400/30 bg-slate-900/70 px-3 py-1 text-xs text-cyan-100"
        >
          Exit
        </button>
      </div>

      <div ref={containerRef} className="relative h-[65vh] w-full flex-1 md:h-[520px]">
        <canvas ref={canvasRef} className="h-full w-full touch-none" />
      </div>

      <div className="space-y-2 border-t border-cyan-400/20 bg-white/5 p-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <p className="text-xs text-cyan-100/85">Touch left side to rotate, touch right side to thrust.</p>
      </div>
    </div>
  );
}
