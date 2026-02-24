"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface MicInputProps {
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
  lang?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((
    event: {
      resultIndex: number;
      results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }>;
    }
  ) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function speechRecognitionCtors() {
  if (typeof window === "undefined") {
    return {
      SpeechRecognition: undefined,
      webkitSpeechRecognition: undefined
    } as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
  }
  const win = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return {
    SpeechRecognition: win.SpeechRecognition,
    webkitSpeechRecognition: win.webkitSpeechRecognition
  };
}

function resolveSpeechError(raw: string) {
  if (raw === "not-allowed") return "Microphone permission denied. Enable microphone access and try again.";
  if (raw === "service-not-allowed") return "Speech service is blocked by browser or OS settings.";
  if (raw === "audio-capture") return "No microphone device available.";
  if (raw === "no-speech") return "No speech detected. Try speaking a bit louder.";
  if (raw === "network") return "Network error during speech recognition.";
  if (raw === "aborted") return "Voice input stopped.";
  return "Voice input failed. Please try again.";
}

interface MicDiagnostics {
  secure: boolean;
  protocol: string;
  host: string;
  permission: "granted" | "denied" | "prompt" | "unknown";
  audioInputCount: number | null;
  browser: string;
}

async function collectMicDiagnostics(): Promise<MicDiagnostics> {
  const diagnostics: MicDiagnostics = {
    secure: typeof window !== "undefined" ? window.isSecureContext : false,
    protocol: typeof window !== "undefined" ? window.location.protocol : "unknown",
    host: typeof window !== "undefined" ? window.location.host : "unknown",
    permission: "unknown",
    audioInputCount: null,
    browser: typeof navigator !== "undefined" ? navigator.userAgent : "unknown"
  };

  if (typeof navigator !== "undefined" && "permissions" in navigator) {
    try {
      const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
      if (status.state === "granted" || status.state === "denied" || status.state === "prompt") {
        diagnostics.permission = status.state;
      }
    } catch {
      diagnostics.permission = "unknown";
    }
  }

  if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      diagnostics.audioInputCount = devices.filter((device) => device.kind === "audioinput").length;
    } catch {
      diagnostics.audioInputCount = null;
    }
  }

  return diagnostics;
}

function diagnosticsSuffix(d: MicDiagnostics) {
  const micCount = d.audioInputCount === null ? "unknown" : String(d.audioInputCount);
  const browser = d.browser.split(" ").slice(0, 2).join(" ");
  return `Details: secure=${d.secure}, permission=${d.permission}, mics=${micCount}, origin=${d.protocol}//${d.host}, browser=${browser}.`;
}

function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)")?.matches ?? false;
}

export function MicInput({ onTranscript, onError, lang = "en-US" }: MicInputProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const liveTextRef = useRef("");
  const startingRef = useRef(false);
  const stoppingRef = useRef(false);
  const [listening, setListening] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);

  const isRecognitionSupported = useMemo(() => {
    const { SpeechRecognition, webkitSpeechRecognition } = speechRecognitionCtors();
    return Boolean(SpeechRecognition || webkitSpeechRecognition);
  }, []);

  const reportError = useCallback(
    (message: string) => {
      setErrorState(message);
      onError?.(message);
    },
    [onError]
  );

  useEffect(() => {
    if (!isRecognitionSupported || typeof window === "undefined") return;
    const { SpeechRecognition, webkitSpeechRecognition } = speechRecognitionCtors();
    const Ctor = SpeechRecognition || webkitSpeechRecognition;
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      startingRef.current = false;
      stoppingRef.current = false;
      setListening(true);
      setErrorState(null);
      onError?.("");
    };

    recognition.onresult = (event) => {
      const finals: string[] = [];
      let latestLive = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result?.[0]?.transcript?.trim();
        if (!text) continue;
        if (result.isFinal) {
          finals.push(text);
        } else {
          latestLive = text;
        }
      }

      if (finals.length > 0) {
        const transcript = finals.join(" ").trim();
        liveTextRef.current = "";
        if (transcript) onTranscript(transcript);
      } else {
        liveTextRef.current = latestLive;
      }
    };

    recognition.onerror = (event) => {
      startingRef.current = false;
      setListening(false);
      reportError(resolveSpeechError(String(event.error ?? "unknown")));
    };

    recognition.onend = () => {
      startingRef.current = false;
      setListening(false);

      const live = liveTextRef.current.trim();
      if (live.length > 0) {
        onTranscript(live);
        liveTextRef.current = "";
      }

      if (stoppingRef.current) {
        stoppingRef.current = false;
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        // Ignore abort errors on cleanup.
      }
      recognitionRef.current = null;
      startingRef.current = false;
      stoppingRef.current = false;
      liveTextRef.current = "";
    };
  }, [isRecognitionSupported, lang, onError, onTranscript, reportError]);

  const startListening = useCallback(async () => {
    if (typeof window === "undefined") return;
    const diagnostics = await collectMicDiagnostics();
    const diagnosticText = diagnosticsSuffix(diagnostics);
    const standalone = isStandaloneApp();

    if (!window.isSecureContext) {
      console.warn("[MicInput]", diagnosticText);
      reportError("Voice input needs HTTPS.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      console.warn("[MicInput]", diagnosticText);
      reportError("Microphone APIs are unavailable in this browser.");
      return;
    }

    // Always request microphone permission first so browser permission prompt appears.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      const domErr = err as { name?: string };
      if (domErr?.name === "NotAllowedError") {
        console.warn("[MicInput]", diagnosticText);
        reportError(
          standalone
            ? "Microphone is blocked for this installed app. Android: long-press app icon -> App info -> Permissions -> Microphone -> Allow."
            : "Microphone permission denied. Tap the lock icon in the address bar and allow Microphone, then reload."
        );
        return;
      }
      if (domErr?.name === "NotFoundError") {
        console.warn("[MicInput]", diagnosticText);
        reportError("No microphone device found.");
        return;
      }
      if (domErr?.name === "NotReadableError") {
        console.warn("[MicInput]", diagnosticText);
        reportError("Microphone is busy in another app.");
        return;
      }
      console.warn("[MicInput]", diagnosticText);
      reportError("Microphone access failed.");
      return;
    }

    if (!isRecognitionSupported) {
      console.warn("[MicInput]", diagnosticText);
      reportError("Microphone is allowed, but speech recognition is not supported here. Use latest Chrome or Edge.");
      return;
    }

    if (!recognitionRef.current) {
      console.warn("[MicInput]", diagnosticText);
      reportError("Speech recognizer failed to initialize.");
      return;
    }

    if (startingRef.current || listening) return;

    try {
      startingRef.current = true;
      recognitionRef.current.start();
    } catch {
      startingRef.current = false;
      console.warn("[MicInput]", diagnosticText);
      reportError("Could not start voice input. Try again.");
    }
  }, [isRecognitionSupported, listening, reportError]);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    stoppingRef.current = true;
    try {
      recognition.stop();
    } catch {
      try {
        recognition.abort();
      } catch {
        // Ignore stop/abort race errors.
      }
    } finally {
      setListening(false);
    }
  }, []);

  const toggleListening = useCallback(async () => {
    if (listening) {
      stopListening();
      return;
    }
    await startListening();
  }, [listening, startListening, stopListening]);

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-full border transition",
        listening
          ? "border-cyan-300/45 bg-cyan-400/15 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.2)]"
          : "border-slate-500/35 bg-slate-900/65 text-slate-300 hover:border-cyan-300/35 hover:text-cyan-100",
        !isRecognitionSupported ? "opacity-80" : ""
      )}
      aria-label={listening ? "Stop voice input" : "Start voice input"}
      title={errorState ?? (listening ? "Listening..." : "Voice input")}
    >
      {listening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
    </button>
  );
}
