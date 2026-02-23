"use client";

import { useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface MicInputProps {
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous?: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((
    event: {
      resultIndex: number;
      results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
    }
  ) => void) | null;
  onend: (() => void) | null;
  onerror?: ((event: { error?: string }) => void) | null;
  onstart?: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

export function MicInput({ onTranscript, onError }: MicInputProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  const reportError = (message: string) => {
    setErrorState(message);
    onError?.(message);
  };

  const toggleListening = async () => {
    if (typeof window === "undefined") return;
    if (!window.isSecureContext) {
      const msg = "Voice input needs a secure context. Use localhost or HTTPS.";
      setSupported(false);
      reportError(msg);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      const msg = "Microphone APIs are unavailable in this browser.";
      setSupported(false);
      reportError(msg);
      return;
    }
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      const msg = "Speech recognition is not supported here. Use latest Chrome or Edge.";
      setSupported(false);
      reportError(msg);
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new Ctor();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => {
        setListening(true);
        setErrorState(null);
      };
      recognition.onresult = (event) => {
        const chunks: string[] = [];
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const text = result?.[0]?.transcript?.trim();
          if (!text) continue;
          if (result.isFinal === false) continue;
          chunks.push(text);
        }
        const transcript = chunks.join(" ").trim();
        if (transcript.length > 0) {
          onTranscript(transcript);
        }
      };
      recognition.onend = () => setListening(false);
      recognition.onerror = (event) => {
        setListening(false);
        const raw = String(event.error ?? "unknown");
        const msg =
          raw === "not-allowed"
            ? "Microphone permission denied."
            : raw === "service-not-allowed"
              ? "Speech service blocked by browser or OS."
              : raw === "audio-capture"
                ? "No microphone device available."
            : raw === "no-speech"
              ? "No speech detected. Try again."
              : raw === "network"
                ? "Voice input network error."
                : "Voice input failed.";
        setErrorState(msg);
        onError?.(msg);
      };
      recognitionRef.current = recognition;
    }

    if (!listening) {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((track) => track.stop());
        } catch (err) {
          const domErr = err as { name?: string; message?: string };
          const host = typeof window !== "undefined" ? window.location.hostname : "";
          const insecureOrigin = !window.isSecureContext || (window.location.protocol !== "https:" && host !== "localhost" && host !== "127.0.0.1");

          if (insecureOrigin) {
            reportError("Mic blocked by insecure origin. Open on localhost or HTTPS.");
            return;
          }

          if (domErr?.name === "NotFoundError") {
            reportError("No microphone device found.");
            return;
          }
          if (domErr?.name === "NotReadableError") {
            reportError("Microphone is busy in another app.");
            return;
          }
          if (domErr?.name === "SecurityError") {
            reportError("Mic blocked by browser security policy.");
            return;
          }
          if (domErr?.name === "NotAllowedError") {
            reportError("Microphone permission denied in browser settings.");
            return;
          }
          reportError("Microphone access failed.");
          return;
        }
      }
      try {
        recognitionRef.current.start();
      } catch {
        const msg = "Could not start voice input.";
        reportError(msg);
      }
    } else {
      recognitionRef.current.stop();
      setListening(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      disabled={!supported}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-full border transition",
        listening
          ? "border-cyan-300/45 bg-cyan-400/15 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.2)]"
          : "border-slate-500/35 bg-slate-900/65 text-slate-300 hover:border-cyan-300/35 hover:text-cyan-100",
        !supported ? "cursor-not-allowed opacity-50" : ""
      )}
      aria-label={listening ? "Stop voice input" : "Start voice input"}
      title={errorState ?? (listening ? "Listening..." : "Voice input")}
    >
      {listening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
    </button>
  );
}
