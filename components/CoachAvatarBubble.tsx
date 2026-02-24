"use client";

interface CoachAvatarBubbleProps {
  message: string;
}

export function CoachAvatarBubble({ message }: CoachAvatarBubbleProps) {
  return (
    <article className="px-panel px-reveal bg-slate-950/95 p-4 backdrop-blur-none md:bg-transparent md:backdrop-blur-xl" style={{ animationDelay: "180ms" }}>
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full border border-cyan-300/45 bg-cyan-400/15 text-sm font-semibold text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.22)]">
          PX
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300">PX Coach</p>
          <div className="mt-1 rounded-2xl border border-cyan-300/35 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 shadow-[0_0_24px_rgba(34,211,238,0.14)]">
            {message}
          </div>
        </div>
      </div>
    </article>
  );
}
