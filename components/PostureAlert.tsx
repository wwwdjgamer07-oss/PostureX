"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PostureAlertType } from "@/lib/postureAlerts";

interface PostureAlertProps {
  active: boolean;
  type: PostureAlertType | null;
  message: string | null;
}

function isDangerType(type: PostureAlertType | null) {
  return type === "forward_head" || type === "slouch" || type === "shoulder";
}

export function PostureAlert({ active, type, message }: PostureAlertProps) {
  if (!message) return null;

  const danger = isDangerType(type);

  return (
    <div
      className={cn(
        "pointer-events-none absolute left-1/2 top-3 z-20 w-[min(90%,420px)] -translate-x-1/2 rounded-xl border px-4 py-2.5 backdrop-blur-xl transition-all duration-300",
        danger
          ? "border-red-300/55 bg-slate-950/80 shadow-[0_0_30px_rgba(239,68,68,0.38)]"
          : "border-cyan-300/50 bg-slate-950/80 shadow-[0_0_30px_rgba(56,189,248,0.35)]",
        active ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-2 text-sm font-medium text-white">
        <AlertTriangle className={cn("h-4 w-4", danger ? "text-red-300" : "text-cyan-300")} />
        <span>{message}</span>
      </div>
    </div>
  );
}
