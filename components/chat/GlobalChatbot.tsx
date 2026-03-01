"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bot, Sparkles, Volume2, X } from "lucide-react";
import { SkullBrainIcon } from "@/components/icons/SkullIcons";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { UserMemoryRecord } from "@/lib/ai/memoryEngine";
import { prepareSpeechText, resolvePreferredVoice, resolveVoiceProfile } from "@/lib/ai/voiceEngine";
import { VoiceToggle } from "@/components/dashboard/VoiceToggle";
import { buildWelcomeMessage, type PostureAIMetrics, type PostureAIMessage } from "@/lib/postureAI";
import { useIsObsidianSkullTheme } from "@/lib/personalization/usePxTheme";
import { cn } from "@/lib/utils";
import ChatInput from "@/components/chat/ChatInput";

interface CoachStateResponse {
  messages?: PostureAIMessage[];
  emotion?: string;
  memory?: UserMemoryRecord | null;
}

interface PageContextPayload {
  path: string;
  pageType: string;
}

const DEFAULT_METRICS: PostureAIMetrics = {
  alignment_score: 0,
  fatigue_level: 0,
  session_duration: 0,
  risk_level: "LOW",
  weekly_trend: []
};

function createMessage(role: "user" | "assistant", content: string): PostureAIMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString()
  };
}

function inferRiskFromScore(score: number) {
  if (score >= 86) return "LOW";
  if (score >= 72) return "MODERATE";
  if (score >= 58) return "HIGH";
  return "SEVERE";
}

function pageTypeFromPath(pathname: string) {
  if (pathname === "/") return "landing";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/session")) return "sessions";
  if (pathname.startsWith("/alerts")) return "alerts";
  if (pathname.startsWith("/profile")) return "profile";
  if (pathname.startsWith("/pricing")) return "pricing";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/history") || pathname.startsWith("/reports")) return "reports";
  return "general";
}

function welcomeByPage(pageType: string) {
  switch (pageType) {
    case "landing":
      return "Hey, I can walk you through how PostureX works and what it can improve in your daily posture.";
    case "pricing":
      return "Trying to choose a plan? Tell me your routine and I can suggest the best fit.";
    case "dashboard":
      return "You are in your dashboard. Want a quick posture check before the next work block?";
    case "alerts":
      return "I can help you interpret these alerts and set a lower-fatigue rhythm for today.";
    case "profile":
      return "Want help optimizing your profile setup for better coaching and reminders?";
    case "settings":
      return "I can help tune your settings so coaching and reminders match your schedule.";
    case "reports":
      return "If you want, I can summarize what your recent trends likely mean and what to fix first.";
    default:
      return "I am here. Ask for a quick posture check, fatigue guidance, or plan recommendation.";
  }
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function compactMicError(message: string) {
  if (!message) return "";
  const clean = message.split("Details:")[0]?.trim() ?? message;
  return clean.length > 140 ? `${clean.slice(0, 140)}...` : clean;
}

function isMicPermissionDeniedMessage(message: string | null) {
  if (!message) return false;
  return /permission blocked|permission denied|not-allowed|service-not-allowed/i.test(message);
}

interface GlobalChatbotProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

export function GlobalChatbot({ open, onOpenChange, showTrigger = true }: GlobalChatbotProps = {}) {
  const isObsidianSkull = useIsObsidianSkullTheme();
  const router = useRouter();
  const pathname = usePathname() || "/";
  const pageType = pageTypeFromPath(pathname);
  const [userId, setUserId] = useState<string | null>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const [messages, setMessages] = useState<PostureAIMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);
  const [micPermissionState, setMicPermissionState] = useState<PermissionState | "unknown">("unknown");
  const [messageTone, setMessageTone] = useState<Record<string, string>>({});
  const [messageProvider, setMessageProvider] = useState<Record<string, "gemini" | "system">>({});
  const [messageModel, setMessageModel] = useState<Record<string, string>>({});
  const [metrics, setMetrics] = useState<PostureAIMetrics>(DEFAULT_METRICS);
  const [memory, setMemory] = useState<UserMemoryRecord | null>(null);
  const [controlEnabled, setControlEnabled] = useState(true);
  const [gameActive, setGameActive] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const lastSpokenMessageRef = useRef<string | null>(null);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const hydratedRef = useRef(false);

  const storageBase = useMemo(() => `posturex.ai.global.${userId ?? "guest"}`, [userId]);
  const storageKey = `${storageBase}.messages`;
  const isControlled = typeof open === "boolean";
  const isOpen = isControlled ? Boolean(open) : internalOpen;
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const setIsOpen = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    const resolved = typeof next === "function" ? (next as (prev: boolean) => boolean)(isOpenRef.current) : next;
    isOpenRef.current = resolved;
    if (!isControlled) {
      setInternalOpen(resolved);
    }
    onOpenChange?.(resolved);
  }, [isControlled, onOpenChange]);

  const syncMicPermissionState = useCallback(async () => {
    if (typeof window === "undefined" || typeof navigator === "undefined" || !("permissions" in navigator)) {
      setMicPermissionState("unknown");
      return;
    }
    try {
      const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
      setMicPermissionState(status.state);
      if (status.state !== "denied") {
        setMicError((prev) => (isMicPermissionDeniedMessage(prev) ? null : prev));
      }
    } catch {
      setMicPermissionState("unknown");
    }
  }, []);

  const requestMic = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMicError("Microphone is not available in this browser.");
      setMicPermissionState("unknown");
      return { granted: false, blocked: false };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicError(null);
      setMicPermissionState("granted");
      return { granted: true, blocked: false };
    } catch (errorValue) {
      const name = errorValue instanceof DOMException ? errorValue.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setMicError("Microphone permission blocked. Enable in browser settings.");
        setMicPermissionState("denied");
        return { granted: false, blocked: true };
      }
      if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setMicError("No microphone found. Connect a microphone and try again.");
        return { granted: false, blocked: false };
      }
      setMicError("Voice input failed. Please try again.");
      return { granted: false, blocked: false };
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadAuth = async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (!active) return;
        setUserId(user?.id ?? null);
      } catch {
        if (!active) return;
        setUserId(null);
      }
    };
    void loadAuth();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isControlled) return;
    const savedOpen = window.localStorage.getItem(`${storageBase}.open`);
    if (savedOpen === "1") setIsOpen(true);

    const raw = window.localStorage.getItem("mrx-settings");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { voiceCoach?: boolean };
      setVoiceEnabled(parsed.voiceCoach !== false);
    } catch {
      // no-op
    }
  }, [isControlled, setIsOpen, storageBase]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`${storageBase}.open`, isOpen ? "1" : "0");
  }, [isOpen, storageBase]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onSettingsUpdate = () => {
      const raw = window.localStorage.getItem("mrx-settings");
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as { voiceCoach?: boolean };
        setVoiceEnabled(parsed.voiceCoach !== false);
      } catch {
        // no-op
      }
    };
    window.addEventListener("posturex-settings-updated", onSettingsUpdate);
    return () => window.removeEventListener("posturex-settings-updated", onSettingsUpdate);
  }, []);

  useEffect(() => {
    let active = true;
    const hydrateChat = async () => {
      if (hydratedRef.current) return;
      hydratedRef.current = true;

      const stored = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as PostureAIMessage[];
          if (active && Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        } catch {
          // Ignore malformed local cache.
        }
      }

      try {
        const stateResponse = await fetch("/api/ai/coach", { method: "GET" });
        if (!stateResponse.ok) throw new Error("Unable to fetch coach state");
        const state = (await stateResponse.json()) as CoachStateResponse;
        if (!active) return;
        if (Array.isArray(state.messages) && state.messages.length > 0) {
          setMessages(state.messages);
        } else {
          const fallback = `${welcomeByPage(pageType)} ${buildWelcomeMessage(DEFAULT_METRICS)}`;
          setMessages((prev) => (prev.length > 0 ? prev : [createMessage("assistant", fallback)]));
        }
        setMemory(state.memory ?? null);
      } catch {
        if (!active) return;
        setMessages((prev) => {
          if (prev.length > 0) return prev;
          return [createMessage("assistant", welcomeByPage(pageType))];
        });
      }
    };

    void hydrateChat();
    return () => {
      active = false;
    };
  }, [pageType, storageKey]);

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
    let active = true;
    const loadMetrics = async () => {
      try {
        const [dailyResponse, weeklyResponse] = await Promise.all([
          fetch("/api/analytics/daily", { method: "GET" }),
          fetch("/api/analytics/weekly", { method: "GET" })
        ]);
        if (!dailyResponse.ok || !weeklyResponse.ok) throw new Error("No analytics");

        const daily = (await dailyResponse.json()) as {
          daily_metrics?: { avg_score?: number; total_duration?: number };
        };
        const weekly = (await weeklyResponse.json()) as {
          data?: Array<{ date: string; avg_score: number; sessions_count: number }>;
        };

        if (!active) return;
        const alignment = Number(daily.daily_metrics?.avg_score ?? 0);
        const trend = Array.isArray(weekly.data) ? weekly.data.slice(-7) : [];
        const inferredRisk = inferRiskFromScore(alignment);
        const inferredFatigue = Math.max(5, Math.min(95, Math.round(100 - alignment)));

        setMetrics({
          alignment_score: alignment,
          fatigue_level: inferredFatigue,
          session_duration: Number(daily.daily_metrics?.total_duration ?? 0),
          risk_level: inferredRisk,
          weekly_trend: trend
        });
      } catch {
        if (!active) return;
        setMetrics((prev) => prev);
      }
    };
    void loadMetrics();
    return () => {
      active = false;
    };
  }, [userId]);

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

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboardOffset = () => {
      const keyboardHeight = Math.max(0, window.innerHeight - viewport.height);
      root.style.setProperty("--kb-offset", keyboardHeight > 0 ? `${keyboardHeight}px` : "0px");
    };

    updateKeyboardOffset();
    viewport.addEventListener("resize", updateKeyboardOffset);
    return () => {
      viewport.removeEventListener("resize", updateKeyboardOffset);
      root.style.setProperty("--kb-offset", "0px");
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const refreshPermission = () => {
      void syncMicPermissionState();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshPermission();
    };

    refreshPermission();
    window.addEventListener("focus", refreshPermission);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", refreshPermission);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isOpen, syncMicPermissionState]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const syncFromDom = () => {
      const active = document.body.classList.contains("px-game-active") || document.documentElement.classList.contains("px-game-active");
      setGameActive(active);
      if (active) setIsOpen(false);
    };

    const onGameState = (event: Event) => {
      const custom = event as CustomEvent<{ active?: boolean }>;
      const active = Boolean(custom.detail?.active);
      setGameActive(active);
      if (active) setIsOpen(false);
    };

    syncFromDom();
    window.addEventListener("posturex-game-active", onGameState as EventListener);
    return () => window.removeEventListener("posturex-game-active", onGameState as EventListener);
  }, [setIsOpen]);

  const speakText = (text: string, emotionTone: string, force = false) => {
    if (!voiceEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (!force && lastSpokenMessageRef.current === text) return;
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

  const resolveRouteTarget = (targetRaw: string) => {
    const target = targetRaw.trim().toLowerCase();
    const map: Record<string, string> = {
      home: "/",
      dashboard: "/dashboard",
      session: "/session",
      sessions: "/session",
      alerts: "/alerts",
      profile: "/profile",
      pricing: "/pricing",
      "ai playground": "/ai-playground",
      playground: "/ai-playground",
      "px play": "/px-play",
      games: "/px-play",
      "lunar lander": "/px-play"
    };
    if (target.startsWith("/")) return target;
    return map[target] ?? null;
  };

  const setTheme = (value: "light" | "dark") => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    window.localStorage.setItem("theme", value);
    if (value === "light") {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    } else {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    }
  };

  const executeWebsiteControl = (raw: string): string | null => {
    const text = raw.trim().toLowerCase();
    if (!text) return null;

    if (text === "help" || text === "commands" || text === "show commands") {
      return [
        "Basic commands:",
        "go to dashboard | go to px play | go to ai playground",
        "play snake | play lander | play pong | play xo | play memory",
        "scroll top | scroll bottom",
        "theme dark | theme light | theme toggle",
        "back | forward | refresh",
        "open chatbot | close chatbot",
        "control on | control off"
      ].join("\n");
    }

    if (text === "control on" || text === "control mode on" || text === "enable control") {
      setControlEnabled(true);
      return "Website control mode enabled.";
    }
    if (text === "control off" || text === "control mode off" || text === "disable control") {
      setControlEnabled(false);
      return "Website control mode disabled.";
    }

    if (!controlEnabled) return null;

    if (text === "where am i" || text === "status") {
      return `You are on ${pathname}. Control mode is ${controlEnabled ? "ON" : "OFF"}.`;
    }

    const navMatch = text.match(/^(go to|open|navigate to)\s+(.+)$/);
    if (navMatch?.[2]) {
      const route = resolveRouteTarget(navMatch[2]);
      if (route) {
        router.push(route);
        return `Opening ${route}.`;
      }
    }

    if (text.startsWith("/")) {
      router.push(text);
      return `Opening ${text}.`;
    }

    if (text === "play snake") {
      router.push("/px-play");
      return "Opening PX Play. Select Snake and press Play.";
    }
    if (text === "play lander" || text === "play lunar lander") {
      router.push("/px-play");
      return "Opening PX Play. Select Lander and press Play.";
    }
    if (text === "play pong") {
      router.push("/px-play");
      return "Opening PX Play. Select Pong and press Play.";
    }
    if (text === "play xo" || text === "play tic tac toe") {
      router.push("/px-play");
      return "Opening PX Play. Select XO and press Play.";
    }
    if (text === "play memory") {
      router.push("/px-play");
      return "Opening PX Play. Select Memory and press Play.";
    }

    if (text === "back" || text === "go back") {
      router.back();
      return "Going back.";
    }
    if (text === "forward" || text === "go forward") {
      window.history.forward();
      return "Going forward.";
    }
    if (text === "reload" || text === "refresh" || text === "refresh page") {
      window.location.reload();
      return "Refreshing page.";
    }
    if (text === "scroll top" || text === "go top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return "Scrolled to top.";
    }
    if (text === "scroll bottom" || text === "go bottom") {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      return "Scrolled to bottom.";
    }
    if (text === "theme dark" || text === "dark mode") {
      setTheme("dark");
      return "Dark theme applied.";
    }
    if (text === "theme light" || text === "light mode") {
      setTheme("light");
      return "Light theme applied.";
    }
    if (text === "theme toggle" || text === "toggle theme") {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "light" : "dark");
      return `Theme changed to ${isDark ? "light" : "dark"}.`;
    }
    if (text === "open chatbot") {
      setIsOpen(true);
      return "Chatbot opened.";
    }
    if (text === "close chatbot") {
      setIsOpen(false);
      return "Chatbot closed.";
    }
    return null;
  };

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed || typing) return;

    const userMessage = createMessage("user", trimmed);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const controlResult = executeWebsiteControl(trimmed);
    if (controlResult) {
      const assistantControlReply = createMessage("assistant", controlResult);
      setMessages((prev) => [...prev, assistantControlReply]);
      setMessageTone((prev) => ({ ...prev, [assistantControlReply.id]: "neutral" }));
      setMessageProvider((prev) => ({ ...prev, [assistantControlReply.id]: "system" }));
      setMessageModel((prev) => ({ ...prev, [assistantControlReply.id]: "system" }));
      speakText(assistantControlReply.content, "neutral");
      return;
    }

    setTyping(true);

    typingTimeoutRef.current = window.setTimeout(async () => {
      try {
        const pageContext: PageContextPayload = { path: pathname, pageType };
        const response = await fetch("/api/ai/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            metrics,
            conversation_history: [...messages, userMessage].slice(-12),
            page_context: pageContext
          })
        });
        if (!response.ok) {
          const errorPayload = (await response.json().catch(() => null)) as { error?: string; code?: string } | null;
          const reason = errorPayload?.code ? `${errorPayload.code}` : errorPayload?.error ? errorPayload.error : "Coach request failed";
          throw new Error(reason);
        }
        const data = (await response.json()) as {
          message?: PostureAIMessage;
          emotion?: { tone?: string };
          memory?: UserMemoryRecord;
          llm_provider?: "gemini" | "none";
          llm_model?: string | null;
          llm_reason?: string | null;
        };
        if (process.env.NODE_ENV !== "production") {
          // Useful for debugging provider selection/failover in local dev.
          console.info("[GlobalChatbot] LLM provider:", data.llm_provider ?? "unknown", "reason:", data.llm_reason ?? "ok");
        }
        const aiReply = data.message ?? createMessage("assistant", "I am here with you. Want a quick posture reset?");
        const fullText = typeof aiReply.content === "string" ? aiReply.content : String(aiReply.content ?? "");
        const normalizedReply = { ...aiReply, content: fullText };
        setMessages((prev) => [...prev, normalizedReply]);
        setMessageTone((prev) => ({ ...prev, [aiReply.id]: data.emotion?.tone ?? "neutral" }));
        setMessageProvider((prev) => ({
          ...prev,
          [aiReply.id]: data.llm_provider === "gemini" ? "gemini" : "system"
        }));
        setMessageModel((prev) => ({
          ...prev,
          [aiReply.id]: data.llm_model || "gemini"
        }));
        if (data.memory) setMemory(data.memory);
        speakText(fullText, data.emotion?.tone ?? "neutral");
      } catch (errorValue) {
        const detail = errorValue instanceof Error ? errorValue.message : "unknown_error";
        const failure = createMessage("assistant", `Gemini is unavailable right now. Please try again. (${detail})`);
        setMessages((prev) => [...prev, failure]);
        setMessageTone((prev) => ({ ...prev, [failure.id]: "neutral" }));
        setMessageProvider((prev) => ({ ...prev, [failure.id]: "system" }));
        setMessageModel((prev) => ({ ...prev, [failure.id]: "system" }));
      } finally {
        setTyping(false);
      }
    }, 320);
  };

  const tooltipText = "PostureX AI";
  const personalizedLabel = memory?.user_name ? `PostureX AI - ${memory.user_name}` : "PostureX AI";
  const isMicDenied =
    micPermissionState === "denied" ||
    (micPermissionState !== "granted" && isMicPermissionDeniedMessage(micError));
  const micStatusText = isMicDenied ? "Microphone blocked" : micError ? compactMicError(micError) : "";
  const chatVisible = isOpen && !gameActive;

  const handleMicFix = async () => {
    if (typeof window === "undefined") return;
    const result = await requestMic();
    await syncMicPermissionState();
    if (result.granted) return;

    if (result.blocked) {
      window.alert(
        "Microphone is blocked.\n1) Click the lock icon in the address bar.\n2) Open Site settings.\n3) Set Microphone to Allow.\n4) Reload this page."
      );
    }
  };

  return (
    <>
      {showTrigger && !chatVisible ? (
        <div className={cn("px-global-chat-trigger-wrap z-[70] transition-all duration-200", gameActive ? "pointer-events-none translate-y-3 opacity-0" : "")}>
          <div className="group relative">
            <button
              type="button"
              onClick={() => {
                if (gameActive) return;
                setIsOpen((prev) => !prev);
              }}
              className="px-global-chat-trigger px-ai-fab floating-ai-btn relative grid h-14 w-14 place-items-center rounded-full border border-cyan-300/50 bg-slate-900/75 text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.28)] backdrop-blur-xl transition duration-300 hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(34,211,238,0.34)] focus:outline-none focus:ring-2 focus:ring-cyan-300/55"
              aria-label={personalizedLabel}
            >
              <span className="absolute inset-0 rounded-full border border-cyan-300/35 animate-pulse" />
              <span className="absolute inset-1 rounded-full bg-gradient-to-br from-cyan-300/20 to-blue-500/10" />
              {isObsidianSkull ? <SkullBrainIcon className="relative h-5 w-5" /> : <Sparkles className="relative h-5 w-5" />}
            </button>
            <span className="pointer-events-none absolute -top-10 right-0 rounded-lg border border-slate-500/35 bg-slate-900/85 px-2 py-1 text-xs text-cyan-100 opacity-0 backdrop-blur transition group-hover:opacity-100">
              {tooltipText}
            </span>
          </div>
        </div>
      ) : null}

      {chatVisible ? (
        <aside
          className="px-global-chat-wrap fixed inset-x-3 top-[calc(env(safe-area-inset-top)+5rem)] bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[68] flex w-auto origin-bottom-right transition-all duration-300 sm:inset-x-auto sm:right-6 sm:top-20 sm:bottom-auto sm:h-[min(78vh,740px)] sm:w-[min(92vw,390px)]"
          aria-hidden={false}
        >
          <div className="px-global-chat-panel chat-panel relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-cyan-300/35 bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-blue-950/70 shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_24px_80px_rgba(2,6,23,0.65)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.2),transparent_44%),radial-gradient(circle_at_92%_0%,rgba(59,130,246,0.14),transparent_36%)]" />

          <header className="relative z-10 border-b border-cyan-200/15 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-100">
                  <span className="relative grid h-8 w-8 place-items-center rounded-full border border-cyan-300/50 bg-cyan-400/20 shadow-[0_0_18px_rgba(34,211,238,0.35)]">
                    <span className="pointer-events-none absolute inset-0 rounded-full border border-cyan-300/40 animate-ping [animation-duration:1.8s]" />
                    <span className="pointer-events-none absolute -inset-1 rounded-full border border-cyan-300/20 animate-pulse" />
                    <span className="relative block h-5 w-5">
                      <span className="absolute left-[1px] top-[4px] h-[7px] w-[7px] rounded-full border border-cyan-50/95 bg-cyan-100/10 shadow-[0_0_8px_rgba(207,250,254,0.5)]">
                        <span className="absolute inset-[1px] rounded-full bg-cyan-50 animate-[eyeBlink_2.4s_ease-in-out_infinite]" />
                      </span>
                      <span className="absolute right-[1px] top-[4px] h-[7px] w-[7px] rounded-full border border-cyan-50/95 bg-cyan-100/10 shadow-[0_0_8px_rgba(207,250,254,0.5)]">
                        <span className="absolute inset-[1px] rounded-full bg-cyan-50 animate-[eyeBlink_2.4s_ease-in-out_infinite]" />
                      </span>
                      <span className="absolute left-1/2 top-[13px] h-[1px] w-[8px] -translate-x-1/2 rounded bg-cyan-50/90" />
                    </span>
                  </span>
                  <span className="relative inline-flex items-center">
                    <span>PostureX AI</span>
                  </span>
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  online
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-cyan-200/70">
                  Control: {controlEnabled ? "ON" : "OFF"} (`control on/off`)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-slate-500/35 bg-slate-900/60 p-1.5 text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100"
                aria-label="Close PostureX AI chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div ref={scrollerRef} className="px-ai-messages relative z-10 flex-1 overflow-y-auto p-3">
            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div key={message.id} className={cn("px-chat-message flex w-full animate-fade-slide", isUser ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "px-chat-bubble chat-bubble px-ai-message rounded-2xl border px-3 py-2 text-sm",
                      isUser
                        ? "px-chat-bubble-user border-slate-500/30 bg-slate-900/75 text-slate-100"
                        : "px-chat-bubble-ai border-cyan-300/35 bg-cyan-400/10 text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,0.14)]"
                    )}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                    {!isUser ? (
                      <button
                        type="button"
                        onClick={() => speakText(message.content, messageTone[message.id] ?? "neutral", true)}
                        className="mt-2 inline-flex items-center gap-1 rounded-full border border-cyan-300/35 bg-cyan-400/10 px-2 py-0.5 text-[10px] text-cyan-100 transition hover:border-cyan-200/60"
                        aria-label="Play message audio"
                      >
                        <Volume2 className="h-3 w-3" />
                        Audio
                      </button>
                    ) : null}
                    {!isUser ? (
                      <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-cyan-200/70">
                        {messageProvider[message.id] === "gemini"
                          ? `Gemini - ${messageModel[message.id] ?? "mode-unknown"}`
                          : "System"}
                      </p>
                    ) : null}
                    <p className={cn("mt-1 text-[10px]", isUser ? "text-slate-400" : "text-cyan-200/75")}>{formatTime(message.createdAt)}</p>
                  </div>
                </div>
              );
            })}

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

          <div className="chat-input-bar relative z-10 border-t border-cyan-200/15 p-3">
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={sendMessage}
              disabled={typing}
              placeholder="Ask anything about posture, plans, or progress..."
              onError={(message) => {
                setMicError(message);
                void syncMicPermissionState();
              }}
              leading={
                <VoiceToggle
                  enabled={voiceEnabled}
                  onToggle={() => {
                    const next = !voiceEnabled;
                    setVoiceEnabled(next);
                    if (typeof window === "undefined") return;
                    const raw = window.localStorage.getItem("mrx-settings");
                    const parsed = raw
                      ? (JSON.parse(raw) as { darkMode?: boolean; voiceCoach?: boolean; notifications?: boolean })
                      : {};
                    window.localStorage.setItem(
                      "mrx-settings",
                      JSON.stringify({
                        ...parsed,
                        voiceCoach: next
                      })
                    );
                    window.dispatchEvent(new Event("posturex-settings-updated"));
                  }}
                />
              }
            />
            {micStatusText ? (
              <div className="mt-2 flex items-center text-[11px]">
                <p className={cn(isMicDenied ? "font-medium text-rose-300" : "text-amber-200/90")}>{micStatusText}</p>
                {isMicDenied ? (
                  <button id="micFixBtn" type="button" className="mic-fix-btn" onClick={handleMicFix}>
                    Enable
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          </div>
        </aside>
      ) : null}
    </>
  );
}
