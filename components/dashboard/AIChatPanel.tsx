"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { SkullBrainIcon } from "@/components/icons/SkullIcons";
import { AIMessage } from "@/components/dashboard/AIMessage";
import { EmotionIndicator } from "@/components/dashboard/EmotionIndicator";
import { MicInput } from "@/components/dashboard/MicInput";
import { VoiceToggle } from "@/components/dashboard/VoiceToggle";
import { prepareSpeechText, resolvePreferredVoice, resolveVoiceProfile } from "@/lib/ai/voiceEngine";
import { buildPostureAIReply, buildWelcomeMessage, type PostureAIMetrics, type PostureAIMessage } from "@/lib/postureAI";
import { useIsObsidianSkullTheme } from "@/lib/personalization/usePxTheme";
import { cn } from "@/lib/utils";

interface AIChatPanelProps {
  userId: string;
  metrics: PostureAIMetrics;
  isOpen: boolean;
  onClose?: () => void;
  mode?: "floating" | "page";
  showClose?: boolean;
}

function durationLabel(seconds: number) {
  const minutes = Math.max(0, Math.floor(seconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
}

function createMessage(role: "user" | "assistant", content: string): PostureAIMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString()
  };
}

export function AIChatPanel({
  userId,
  metrics,
  isOpen,
  onClose,
  mode = "floating",
  showClose = true
}: AIChatPanelProps) {
  const isObsidianSkull = useIsObsidianSkullTheme();
  const pathname = usePathname() || "/";
  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);
  const storageKey = useMemo(() => `posturex.ai.chat.${userId}`, [userId]);
  const [messages, setMessages] = useState<PostureAIMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [emotion, setEmotion] = useState("neutral");
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [micError, setMicError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const lastSpokenMessageRef = useRef<string | null>(null);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("mrx-settings");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { voiceCoach?: boolean };
      setVoiceEnabled(parsed.voiceCoach !== false);
    } catch {
      // no-op
    }
  }, [storageKey]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/ai/coach", { method: "GET" });
        if (!response.ok) throw new Error("Failed to load coach state");
        const data = (await response.json()) as {
          messages?: PostureAIMessage[];
          emotion?: string;
        };
        if (!active) return;
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          setMessages([createMessage("assistant", buildWelcomeMessage(metrics))]);
        }
        setEmotion(data.emotion ?? "neutral");
      } catch {
        if (!active) return;
        const stored = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as PostureAIMessage[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMessages(parsed);
              return;
            }
          } catch {
            // Ignore parse failure and fallback to welcome message.
          }
        }
        setMessages([createMessage("assistant", buildWelcomeMessage(metrics))]);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [metrics, storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("mrx-settings");
    let parsed: { darkMode?: boolean; voiceCoach?: boolean; notifications?: boolean } = {};
    if (raw) {
      try {
        parsed = JSON.parse(raw) as { darkMode?: boolean; voiceCoach?: boolean; notifications?: boolean };
      } catch {
        parsed = {};
      }
    }
    window.localStorage.setItem(
      "mrx-settings",
      JSON.stringify({
        ...parsed,
        voiceCoach: voiceEnabled
      })
    );
    window.dispatchEvent(new Event("posturex-settings-updated"));
  }, [voiceEnabled]);

  useEffect(() => {
    if (typeof window === "undefined" || messages.length === 0) return;
    window.localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (mode !== "floating" || !isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleClose, isOpen, mode]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const setPreferred = () => {
      preferredVoiceRef.current = resolvePreferredVoice("en-US");
    };
    setPreferred();
    window.speechSynthesis.addEventListener("voiceschanged", setPreferred);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", setPreferred);
  }, []);

  const speakText = (text: string, emotionTone: string) => {
    if (!voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (lastSpokenMessageRef.current === text) return;
    const utterance = new SpeechSynthesisUtterance(prepareSpeechText(text));
    const profile = resolveVoiceProfile(emotionTone);
    utterance.rate = profile.rate;
    utterance.pitch = profile.pitch;
    utterance.volume = profile.volume;
    if (!preferredVoiceRef.current) {
      preferredVoiceRef.current = resolvePreferredVoice("en-US");
    }
    if (preferredVoiceRef.current) {
      utterance.voice = preferredVoiceRef.current;
      utterance.lang = preferredVoiceRef.current.lang || "en-US";
    } else {
      utterance.lang = "en-US";
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    lastSpokenMessageRef.current = text;
  };

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed || typing) return;

    const userMessage = createMessage("user", trimmed);
    const historyForRequest = [...messages, userMessage].slice(-12);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setTyping(true);

    typingTimeoutRef.current = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/ai/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            metrics,
            conversation_history: historyForRequest,
            page_context: {
              path: pathname,
              pageType: pathname.startsWith("/dashboard") ? "dashboard" : "general"
            }
          })
        });
        if (!response.ok) throw new Error("Coach request failed");
        const data = (await response.json()) as {
          message?: PostureAIMessage;
          emotion?: { primary?: string; tone?: string };
        };
        const aiReply = data.message ?? createMessage("assistant", buildPostureAIReply(trimmed, metrics));
        setMessages((prev) => [...prev, aiReply]);
        if (data.emotion?.primary) setEmotion(data.emotion.primary);
        speakText(aiReply.content, data.emotion?.tone ?? "neutral");
      } catch {
        const fallback = createMessage("assistant", buildPostureAIReply(trimmed, metrics));
        setMessages((prev) => [...prev, fallback]);
        speakText(fallback.content, "neutral");
      } finally {
        setTyping(false);
      }
    }, 380);
  };

  return (
    <aside
      className={cn(
        mode === "floating"
          ? "fixed bottom-24 right-6 top-24 z-40 w-[380px]"
          : "relative w-full",
        "transition-transform duration-300",
        mode === "floating" && !isOpen ? "translate-x-[420px] pointer-events-none opacity-0" : "translate-x-0 opacity-100"
      )}
      aria-hidden={mode === "floating" ? !isOpen : false}
    >
      <div className="px-ai-chat-panel px-panel flex h-full min-h-[560px] flex-col overflow-hidden border-cyan-300/35 shadow-[0_0_35px_rgba(34,211,238,0.16)]">
        <header className="border-b border-slate-500/25 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-100">
                <span className="grid h-7 w-7 place-items-center rounded-full border border-cyan-300/45 bg-cyan-400/15">
                  {isObsidianSkull ? <SkullBrainIcon className="h-4 w-4 text-violet-200" /> : <Sparkles className="h-4 w-4 text-cyan-200" />}
                </span>
                PostureX AI Coach
              </p>
              <p className="mt-1 text-xs text-slate-400">Live posture guidance</p>
            </div>
            <div className="flex items-center gap-2">
              <EmotionIndicator emotion={emotion} />
              <VoiceToggle enabled={voiceEnabled} onToggle={() => setVoiceEnabled((v) => !v)} />
              {mode === "floating" ? (
                <Link href="/dashboard/ai" className="rounded-lg border border-slate-500/30 bg-slate-900/60 px-2 py-1 text-xs text-slate-300 transition hover:border-cyan-300/35 hover:text-cyan-100">
                  Full page
                </Link>
              ) : null}
              {showClose ? (
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-slate-500/35 bg-slate-900/65 p-1.5 text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
                  aria-label="Close AI chat"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2 border-b border-slate-500/20 p-3">
          <article className="px-kpi p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Alignment</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">{Math.round(metrics.alignment_score)}%</p>
          </article>
          <article className="px-kpi p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Fatigue</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">{Math.round(metrics.fatigue_level)}</p>
          </article>
          <article className="px-kpi p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Risk</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">{metrics.risk_level}</p>
          </article>
          <article className="px-kpi p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Session</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">{durationLabel(metrics.session_duration)}</p>
          </article>
        </div>

        <div ref={scrollerRef} className="flex-1 space-y-3 overflow-y-auto p-3">
          {messages.map((message) => (
            <AIMessage key={message.id} message={message} />
          ))}

          {typing ? (
            <div className="flex w-full justify-start animate-fade-slide">
              <div className="inline-flex items-center gap-1.5 rounded-2xl border border-cyan-300/35 bg-cyan-400/10 px-3 py-2 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.15)]">
                {isObsidianSkull ? <SkullBrainIcon className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-200 animate-pulse" />
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-200 animate-pulse [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-200 animate-pulse [animation-delay:240ms]" />
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-slate-500/20 p-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-500/35 bg-slate-900/65 px-3 py-2 backdrop-blur">
            <MicInput
              onTranscript={(text) => {
                setMicError(null);
                setInput((prev) => (prev ? `${prev} ${text}` : text));
              }}
              onError={(message) => setMicError(message || null)}
            />
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask about your posture..."
              className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={typing || input.trim().length === 0}
              className="grid h-8 w-8 place-items-center rounded-full border border-cyan-300/45 bg-cyan-400/15 text-cyan-100 transition hover:shadow-[0_0_16px_rgba(34,211,238,0.24)] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          {micError ? <p className="mt-2 text-[11px] text-amber-200/90">{micError}</p> : null}
        </div>
      </div>
    </aside>
  );
}
