"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Send } from "lucide-react";
import MicButton from "@/components/chat/MicButton";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
  autoSendOnStop?: boolean;
  leading?: ReactNode;
  onError?: (message: string | null) => void;
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Ask anything...",
  autoSendOnStop = false,
  leading,
  onError
}: ChatInputProps) {
  const { startListening, stopListening, transcript, listening, supported, error } = useSpeechRecognition();
  const [toast, setToast] = useState<string | null>(null);
  const preSpeechValueRef = useRef("");
  const prevListeningRef = useRef(false);

  useEffect(() => {
    if (!onError) return;
    onError(error);
  }, [error, onError]);

  useEffect(() => {
    if (error === "Microphone permission blocked. Enable in browser settings.") {
      setToast(error);
      const timer = window.setTimeout(() => setToast(null), 2600);
      return () => window.clearTimeout(timer);
    }
    return;
  }, [error]);

  useEffect(() => {
    if (listening && !prevListeningRef.current) {
      preSpeechValueRef.current = value.trim();
    }

    if (listening && transcript) {
      const merged = [preSpeechValueRef.current, transcript].filter(Boolean).join(" ").trim();
      onChange(merged);
    }

    if (!listening && prevListeningRef.current && autoSendOnStop && value.trim().length > 0 && !disabled) {
      onSubmit();
    }

    prevListeningRef.current = listening;
  }, [autoSendOnStop, disabled, listening, onChange, onSubmit, transcript, value]);

  const handleMicClick = () => {
    if (disabled) return;
    if (listening) {
      stopListening();
      return;
    }
    void startListening();
  };

  return (
    <div className="relative">
      {toast ? (
        <div className="pointer-events-none absolute -top-11 left-0 right-0 z-20 mx-auto w-fit rounded-lg border border-amber-300/40 bg-amber-500/20 px-3 py-1.5 text-xs text-amber-100 backdrop-blur">
          {toast}
        </div>
      ) : null}
      <div className="flex items-center gap-2 rounded-full border border-slate-500/35 bg-slate-900/65 px-3 py-2 backdrop-blur">
        {leading}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
        />
        {supported ? <MicButton listening={listening} disabled={disabled} onClick={handleMicClick} /> : null}
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || value.trim().length === 0}
          className="grid h-9 w-9 place-items-center rounded-full border border-cyan-300/45 bg-cyan-400/15 text-cyan-100 transition hover:shadow-[0_0_16px_rgba(34,211,238,0.24)] disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
