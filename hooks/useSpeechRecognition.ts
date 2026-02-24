"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionErrorCode =
  | "aborted"
  | "audio-capture"
  | "bad-grammar"
  | "language-not-supported"
  | "network"
  | "no-speech"
  | "not-allowed"
  | "service-not-allowed";

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: {
    transcript: string;
  };
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: SpeechRecognitionErrorCode | string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognitionLike, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionLike, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionLike, ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((this: SpeechRecognitionLike, ev: SpeechRecognitionErrorEventLike) => void) | null;
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

function toErrorMessage(code: string) {
  switch (code) {
    case "no-speech":
      return "No speech detected. Try speaking clearly.";
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone permission blocked. Enable in browser settings.";
    case "audio-capture":
      return "No microphone found. Connect a microphone and try again.";
    default:
      return "Voice input failed. Please try again.";
  }
}

export function useSpeechRecognition() {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const shouldRestartRef = useRef(false);
  const manualStopRef = useRef(false);
  const silenceStopRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearTimers = useCallback(() => {
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const armSilenceStop = useCallback(() => {
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = window.setTimeout(() => {
      silenceStopRef.current = true;
      shouldRestartRef.current = false;
      recognitionRef.current?.stop();
    }, 5000);
  }, []);

  const stopListening = useCallback(() => {
    manualStopRef.current = true;
    shouldRestartRef.current = false;
    silenceStopRef.current = false;
    clearTimers();
    recognitionRef.current?.stop();
  }, [clearTimers]);

  const startListening = useCallback(async () => {
    if (typeof window === "undefined") return;
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      setError("Voice input is not supported in this browser.");
      return;
    }
    if (!window.isSecureContext) {
      setError("Voice input requires HTTPS.");
      return;
    }

    setSupported(true);
    setError(null);

    if (!recognitionRef.current) {
      const recognition = new Ctor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-IN";

      recognition.onstart = () => {
        setListening(true);
        armSilenceStop();
      };

      recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const segment = result?.[0]?.transcript ?? "";
          if (result.isFinal) {
            finalTranscriptRef.current = `${finalTranscriptRef.current} ${segment}`.trim();
          } else {
            interim = `${interim} ${segment}`.trim();
          }
        }
        const nextTranscript = `${finalTranscriptRef.current} ${interim}`.trim();
        setTranscript(nextTranscript);
        armSilenceStop();
      };

      recognition.onerror = (event) => {
        const code = String(event.error || "unknown");
        setError(toErrorMessage(code));
        if (code === "not-allowed" || code === "service-not-allowed" || code === "audio-capture") {
          shouldRestartRef.current = false;
        }
      };

      recognition.onend = () => {
        setListening(false);
        if (silenceTimerRef.current) {
          window.clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        const shouldRestart = shouldRestartRef.current && !manualStopRef.current && !silenceStopRef.current;
        manualStopRef.current = false;
        silenceStopRef.current = false;
        if (shouldRestart) {
          restartTimerRef.current = window.setTimeout(() => {
            try {
              recognition.start();
            } catch {
              // Browser can throw if already starting; ignore and wait for next onend cycle.
            }
          }, 250);
        }
      };

      recognitionRef.current = recognition;
    }

    finalTranscriptRef.current = "";
    setTranscript("");
    manualStopRef.current = false;
    silenceStopRef.current = false;
    shouldRestartRef.current = true;

    try {
      recognitionRef.current.start();
    } catch {
      // Ignore "already started" style exceptions.
    }
  }, [armSilenceStop]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSupported(Boolean(Ctor));
    return () => {
      shouldRestartRef.current = false;
      clearTimers();
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, [clearTimers]);

  return {
    startListening,
    stopListening,
    transcript,
    listening,
    supported,
    error
  };
}

