"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIButtonProps {
  onClick: () => void;
}

export function AIButton({ onClick }: AIButtonProps) {
  return (
    <div className="floating-ai fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-3 z-20 group sm:right-6">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "ui-interactive grid h-14 w-14 place-items-center rounded-full border border-cyan-300/45 bg-slate-900/70 text-cyan-200 shadow-[0_0_28px_rgba(34,211,238,0.22)] backdrop-blur-xl transition duration-300 hover:scale-[1.03] hover:shadow-[0_0_34px_rgba(34,211,238,0.3)] focus:outline-none focus:ring-2 focus:ring-cyan-300/55"
        )}
        aria-label="AI Coach"
      >
        <span className="absolute inset-0 rounded-full border border-cyan-300/30 opacity-0 transition group-hover:opacity-100 group-hover:animate-pulse" />
        <span className="absolute inset-1 rounded-full border border-cyan-300/30 bg-gradient-to-br from-cyan-300/10 to-blue-400/10" />
        <Sparkles className="relative h-5 w-5" />
      </button>
      <span className="pointer-events-none absolute -top-10 right-0 rounded-lg border border-slate-500/35 bg-slate-900/85 px-2 py-1 text-xs text-cyan-100 opacity-0 backdrop-blur transition group-hover:opacity-100">
        AI Coach
      </span>
    </div>
  );
}
