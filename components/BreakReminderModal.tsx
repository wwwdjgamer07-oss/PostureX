"use client";

import { TimerReset, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function BreakReminderModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="glass-card relative w-full max-w-md p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg border border-blue-300/25 bg-blue-500/10 p-1.5 text-slate-300 transition hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/15">
          <TimerReset className="h-5 w-5 text-cyan-300" />
        </div>
        <h3 className="text-xl font-semibold text-white">Break reminder</h3>
        <p className="mt-2 text-sm text-slate-300">
          You have been in an active session for 20 minutes. Stand up, stretch chest/hip flexors, and reset posture baseline.
        </p>
        <button type="button" onClick={onClose} className="btn-primary mt-4 w-full">
          Resume Session
        </button>
      </div>
    </div>
  );
}
