"use client";

type SnakeDesktopProps = {
  onExit?: () => void;
};

export default function SnakeDesktop({ onExit }: SnakeDesktopProps) {
  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-white/5 p-4 text-white backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm tracking-widest text-cyan-100">SNAKE</p>
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg border border-cyan-400/30 bg-slate-900/70 px-3 py-1 text-xs text-cyan-100"
          >
            Exit
          </button>
        ) : null}
      </div>
      <p className="text-sm text-slate-300">Desktop Snake implementation remains in the existing desktop game system.</p>
    </div>
  );
}

