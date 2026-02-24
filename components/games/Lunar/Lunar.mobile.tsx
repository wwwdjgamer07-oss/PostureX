"use client";

import { useEffect, useRef, useState } from "react";

type LunarMobileProps = {
  onExit?: () => void;
};
const MAX_DPR = 2;

export default function LunarMobile({ onExit }: LunarMobileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const keysRef = useRef({ left: false, right: false, thrust: false });
  const shipRef = useRef({ x: 180, y: 120, vx: 0, vy: 0, angle: 0 });
  const [fuel, setFuel] = useState(280);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
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
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const loop = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;

      const dt = 1 / 60;
      const w = canvas.width;
      const h = canvas.height;
      const ground = h - 58;

      if (keysRef.current.left) shipRef.current.angle -= 1.7 * dt;
      if (keysRef.current.right) shipRef.current.angle += 1.7 * dt;

      let thrust = 0;
      if (keysRef.current.thrust && fuel > 0) {
        thrust = 120;
        setFuel((f) => Math.max(0, f - 0.5));
      }

      shipRef.current.vx += Math.sin(shipRef.current.angle) * thrust * dt;
      shipRef.current.vy += (42 - Math.cos(shipRef.current.angle) * thrust) * dt;
      shipRef.current.x += shipRef.current.vx * dt;
      shipRef.current.y += shipRef.current.vy * dt;

      shipRef.current.x = Math.max(10, Math.min(w - 10, shipRef.current.x));

      if (shipRef.current.y >= ground) {
        shipRef.current.y = ground;
        shipRef.current.vx *= 0.2;
        shipRef.current.vy = 0;
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
      if (keysRef.current.thrust && fuel > 0) {
        ctx.strokeStyle = "#22d3ee";
        ctx.beginPath();
        ctx.moveTo(-4, 10);
        ctx.lineTo(0, 18 + Math.random() * 8);
        ctx.lineTo(4, 10);
        ctx.stroke();
      }
      ctx.restore();

      ctx.fillStyle = "#e5e7eb";
      ctx.font = "600 16px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(`Fuel: ${Math.round(fuel)}`, 12, 24);
      ctx.fillText(`V-Speed: ${Math.round(shipRef.current.vy)}`, 12, 44);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [fuel]);

  const hold = (key: keyof typeof keysRef.current, state: boolean) => {
    keysRef.current[key] = state;
  };

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

      <div ref={containerRef} className="flex-1 w-full">
        <canvas ref={canvasRef} className="h-full w-full" />
      </div>

      <div className="space-y-2 border-t border-cyan-400/20 bg-white/5 p-3 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onTouchStart={() => hold("left", true)}
            onTouchEnd={() => hold("left", false)}
            onTouchCancel={() => hold("left", false)}
            className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3 text-sm font-semibold"
          >
            Left
          </button>
          <button
            type="button"
            onTouchStart={() => hold("thrust", true)}
            onTouchEnd={() => hold("thrust", false)}
            onTouchCancel={() => hold("thrust", false)}
            className="rounded-2xl border border-cyan-400/30 bg-cyan-500/20 p-3 text-sm font-semibold shadow-[0_0_24px_rgba(34,211,238,0.2)]"
          >
            Thrust
          </button>
          <button
            type="button"
            onTouchStart={() => hold("right", true)}
            onTouchEnd={() => hold("right", false)}
            onTouchCancel={() => hold("right", false)}
            className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-3 text-sm font-semibold"
          >
            Right
          </button>
        </div>
      </div>
    </div>
  );
}
