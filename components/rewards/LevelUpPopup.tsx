"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { LevelUpPayload } from "@/lib/rewards/engine";
import { useEffect } from "react";

interface LevelUpPopupProps {
  open: boolean;
  payload: LevelUpPayload | null;
  onClose: () => void;
}

const particles = Array.from({ length: 14 }, (_, index) => ({
  id: index,
  x: Math.cos((index / 14) * Math.PI * 2) * (42 + (index % 4) * 8),
  y: Math.sin((index / 14) * Math.PI * 2) * (42 + ((index + 1) % 4) * 8)
}));

export function LevelUpPopup({ open, payload, onClose }: LevelUpPopupProps) {
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onClose, 3000);
    return () => window.clearTimeout(timer);
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open && payload ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center px-[max(1rem,env(safe-area-inset-left))] py-[max(1rem,env(safe-area-inset-top))]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-slate-950/72 backdrop-blur-md" />

          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-[92vw] overflow-hidden rounded-[24px] border border-cyan-300/55 bg-slate-900/80 p-6 text-center shadow-[0_24px_70px_rgba(34,211,238,0.24)] sm:max-w-[420px]"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={(event) => event.stopPropagation()}
          >
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-[24px] border border-cyan-300/35"
              animate={{ scale: [1, 1.08, 1], opacity: [0.65, 0.22, 0.65] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />

            {particles.map((particle) => (
              <motion.span
                key={particle.id}
                className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-cyan-300/80"
                initial={{ x: 0, y: 0, opacity: 0.95, scale: 1 }}
                animate={{ x: particle.x, y: particle.y, opacity: 0, scale: 0.4 }}
                transition={{ duration: 0.95, delay: particle.id * 0.02, ease: "easeOut" }}
              />
            ))}

            <div className="relative">
              <p className="text-sm uppercase tracking-[0.16em] text-cyan-200">{"\u{1F389} Level Up!"}</p>
              <h3 className="mt-2 bg-gradient-to-r from-cyan-200 via-sky-200 to-indigo-200 bg-clip-text text-4xl font-semibold text-transparent">
                Level {payload.level}
              </h3>

              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-xl border border-cyan-300/25 bg-white/5 px-2 py-2">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400">XP</p>
                  <p className="text-cyan-100">+{payload.xpGained}</p>
                </div>
                <div className="rounded-xl border border-cyan-300/25 bg-white/5 px-2 py-2">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Coins</p>
                  <p className="text-cyan-100">+{payload.coinsEarned}</p>
                </div>
                <div className="rounded-xl border border-cyan-300/25 bg-white/5 px-2 py-2">
                  <p className="text-[11px] uppercase tracking-[0.1em] text-slate-400">Gems</p>
                  <p className="text-cyan-100">+{payload.gemsEarned}</p>
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-300">Tap anywhere to continue</p>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
