"use client";

import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface MicButtonProps {
  listening: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export default function MicButton({ listening, disabled = false, onClick }: MicButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full border border-cyan-300/45 text-cyan-100 transition",
        listening
          ? "bg-red-500 animate-pulse ring-4 ring-red-400/40"
          : "bg-cyan-500/20 hover:shadow-[0_0_16px_rgba(34,211,238,0.24)]",
        disabled ? "cursor-not-allowed opacity-50" : ""
      )}
      aria-label={listening ? "Stop microphone" : "Start microphone"}
      aria-pressed={listening}
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}

