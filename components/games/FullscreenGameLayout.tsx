"use client";

interface FullscreenGameLayoutProps {
  title: string;
  canvas: React.ReactNode;
  controls: React.ReactNode;
  onExit: () => void;
}

export function FullscreenGameLayout({ title, canvas, controls, onExit }: FullscreenGameLayoutProps) {
  return (
    <div className="fixed inset-0 z-50 flex min-h-[100dvh] flex-col bg-[#020617]">
      <header className="flex h-12 items-center justify-between gap-3 border-b border-cyan-400/20 bg-black/30 px-3">
        <p className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100 sm:text-sm">{title}</p>
        <button type="button" onClick={onExit} className="rounded-md border border-cyan-300/45 px-3 py-1 text-xs text-cyan-100">
          Exit
        </button>
      </header>
      <div className="flex-1 relative overflow-hidden">{canvas}</div>
      <div className="grid grid-cols-1 gap-2 bg-black/40 p-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:grid-cols-3 sm:gap-3 sm:p-3">{controls}</div>
    </div>
  );
}
