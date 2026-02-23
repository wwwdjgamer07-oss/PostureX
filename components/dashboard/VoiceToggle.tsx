"use client";

import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

export function VoiceToggle({ enabled, onToggle }: VoiceToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "rounded-lg border bg-slate-900/65 p-1.5 text-slate-300 transition",
        enabled
          ? "border-cyan-300/45 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.2)]"
          : "border-slate-500/35 hover:border-cyan-300/35 hover:text-cyan-100"
      )}
      aria-label={enabled ? "Disable voice coach" : "Enable voice coach"}
      title={enabled ? "Voice on" : "Voice off"}
    >
      {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}

