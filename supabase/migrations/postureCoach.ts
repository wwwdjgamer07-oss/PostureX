import { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { detectEmotionSignal, type EmotionLabel } from "@/lib/ai/emotionEngine";
import { generateCoachResponse } from "@/lib/ai/responseGenerator";
import type { UserMemoryRecord } from "@/lib/ai/memoryEngine";
import type { PostureAIMetrics } from "@/lib/postureAI";

export interface CoachContext {
  userName: string;
  recentSession: {
    score: number;
    duration: number;
    risk: string;
    date: string;
  } | null;
  weeklyAverage: number;
  streak: number;
  metrics: PostureAIMetrics;
  emotion: EmotionLabel;
  memory: UserMemoryRecord | null;
}

export interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
}

interface ApiCoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

function toMessage(msg: ApiCoachMessage): Message {
  return {
    id: msg.id,
    role: msg.role === "assistant" ? "ai" : "user",
    content: msg.content,
    timestamp: new Date(msg.createdAt)
  };
}

async function fetchBaseMetrics(supabase: SupabaseClient, userId: string): Promise<CoachContext> {
  const [{ data: userData }, { data: sessionData }, { data: metricsData }, { data: streakData }] = await Promise.all([
    supabase.from("users").select("full_name").eq("id", userId).single(),
    supabase
      .from("sessions")
      .select("avg_alignment, avg_stability, avg_symmetry, duration_seconds, started_at, peak_risk")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("daily_metrics")
      .select("date, avg_score, sessions_count")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(7),
    supabase.from("user_streaks").select("current_streak").eq("user_id", userId).maybeSingle()
  ]);

  const weeklyTrend = (Array.isArray(metricsData) ? metricsData : [])
    .map((row) => ({
      date: String((row as { date?: string }).date ?? ""),
      avg_score: Number((row as { avg_score?: number }).avg_score ?? 0),
      sessions_count: Number((row as { sessions_count?: number }).sessions_count ?? 0)
    }))
    .reverse();

  const weeklyAverage =
    weeklyTrend.length > 0
      ? Math.round(weeklyTrend.reduce((acc, curr) => acc + curr.avg_score, 0) / weeklyTrend.length)
      : 0;

  const alignmentScore = Number((sessionData as { avg_alignment?: number } | null)?.avg_alignment ?? weeklyAverage ?? 0);
  const riskLevel = String((sessionData as { peak_risk?: string } | null)?.peak_risk ?? "LOW").toUpperCase();
  const fatigueLevel =
    riskLevel === "SEVERE" ? 82 : riskLevel === "HIGH" ? 68 : riskLevel === "MODERATE" ? 48 : 22;
  const sessionDuration = Number((sessionData as { duration_seconds?: number } | null)?.duration_seconds ?? 0);

  return {
    userName: userData?.full_name?.split(" ")[0] || "Friend",
    recentSession: sessionData
      ? {
          score: Math.round(
            (Number((sessionData as { avg_alignment?: number }).avg_alignment ?? 0) +
              Number((sessionData as { avg_stability?: number }).avg_stability ?? 0) +
              Number((sessionData as { avg_symmetry?: number }).avg_symmetry ?? 0)) /
              3
          ),
          duration: sessionDuration,
          risk: riskLevel,
          date: String((sessionData as { started_at?: string }).started_at ?? new Date().toISOString())
        }
      : null,
    weeklyAverage,
    streak: Number(streakData?.current_streak ?? 0),
    metrics: {
      alignment_score: alignmentScore,
      fatigue_level: fatigueLevel,
      session_duration: sessionDuration,
      risk_level: riskLevel,
      weekly_trend: weeklyTrend
    },
    emotion: "neutral",
    memory: null
  };
}

export function usePostureChat(supabase: SupabaseClient) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [context, setContext] = useState<CoachContext | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const apiHistory = useMemo(
    () =>
      messages.map((msg) => ({
        id: msg.id,
        role: msg.role === "ai" ? ("assistant" as const) : ("user" as const),
        content: msg.content,
        createdAt: msg.timestamp.toISOString()
      })),
    [messages]
  );

  useEffect(() => {
    let active = true;
    async function loadInitialContext() {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!active || !user) return;

      setUserId(user.id);
      const baseContext = await fetchBaseMetrics(supabase, user.id);
      if (!active) return;

      try {
        const response = await fetch("/api/ai/coach", { method: "GET" });
        if (!response.ok) throw new Error("coach-load-failed");
        const payload = (await response.json()) as {
          messages?: ApiCoachMessage[];
          emotion?: EmotionLabel;
          memory?: UserMemoryRecord | null;
        };

        setContext({
          ...baseContext,
          emotion: payload.emotion ?? "neutral",
          memory: payload.memory ?? null
        });

        if (Array.isArray(payload.messages) && payload.messages.length > 0) {
          setMessages(payload.messages.map(toMessage));
        } else {
          setMessages([
            {
              id: "welcome",
              role: "ai",
              content: `Hey ${baseContext.userName}. I am your PostureX coach. I will use your live posture data and your history so we can improve steadily.`,
              timestamp: new Date()
            }
          ]);
        }
      } catch {
        setContext(baseContext);
        setMessages([
          {
            id: "welcome",
            role: "ai",
            content: `Hey ${baseContext.userName}. I am your PostureX coach. I will use your live posture data and your history so we can improve steadily.`,
            timestamp: new Date()
          }
        ]);
      }
    }

    void loadInitialContext();
    return () => {
      active = false;
    };
  }, [supabase]);

  const handleSend = async () => {
    if (!input.trim() || !context || !userId || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date()
    };
    const historyForRequest = [
      ...apiHistory,
      {
        id: userMsg.id,
        role: "user" as const,
        content: userMsg.content,
        createdAt: userMsg.timestamp.toISOString()
      }
    ].slice(-14);

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          metrics: context.metrics,
          conversation_history: historyForRequest
        })
      });

      if (!response.ok) throw new Error("coach-request-failed");
      const payload = (await response.json()) as {
        message: ApiCoachMessage;
        emotion?: { primary?: EmotionLabel };
        memory?: UserMemoryRecord;
      };

      setMessages((prev) => [...prev, toMessage(payload.message)]);
      setContext((prev) =>
        prev
          ? {
              ...prev,
              emotion: payload.emotion?.primary ?? prev.emotion,
              memory: payload.memory ?? prev.memory
            }
          : prev
      );
    } catch {
      const emotion = detectEmotionSignal({
        userMessage: userMsg.content,
        metrics: context.metrics,
        previousEmotion: context.emotion
      });
      const fallback = generateCoachResponse({
        userMessage: userMsg.content,
        metrics: context.metrics,
        emotion,
        memory: context.memory,
        history: historyForRequest
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-fallback`,
          role: "ai",
          content: fallback,
          timestamp: new Date()
        }
      ]);
      setContext((prev) => (prev ? { ...prev, emotion: emotion.primaryEmotion } : prev));
    } finally {
      setIsTyping(false);
    }
  };

  return { messages, input, setInput, handleSend, isTyping, context };
}
