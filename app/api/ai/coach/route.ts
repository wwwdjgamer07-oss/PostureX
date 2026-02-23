import { createServerSupabaseClient } from "@/lib/supabase/server";
import { detectEmotionSignal, type EmotionLabel } from "@/lib/ai/emotionEngine";
import { buildUpdatedMemory, createDefaultMemory, type UserMemoryRecord } from "@/lib/ai/memoryEngine";
import { generateLLMCoachResponse } from "@/lib/ai/llmCoach";
import { selectCoachPersona } from "@/lib/ai/coachPersona";
import type { PostureAIMetrics, PostureAIMessage } from "@/lib/postureAI";
import { sanitizeText } from "@/lib/api/request";
import { apiError, apiOk } from "@/lib/api/response";

export const runtime = "nodejs";

interface ConversationLogRow {
  id: string;
  role: "user" | "assistant";
  message: string;
  created_at: string;
}

interface EmotionStateRow {
  primary_emotion: EmotionLabel;
  intensity: number;
  confidence: number;
}

interface UserMemoryRow {
  user_name: string | null;
  work_type: string | null;
  pain_points: unknown;
  goals: unknown;
  motivation_style: string | null;
  posture_history: unknown;
  emotional_patterns: unknown;
  fatigue_trends: unknown;
  preferences: unknown;
  conversation_summary: string | null;
}

interface CoachRequestBody {
  message: string;
  metrics: PostureAIMetrics;
  conversation_history?: PostureAIMessage[];
  page_context?: {
    path?: string;
    pageType?: string;
  };
}

const RISK_LEVELS = new Set(["LOW", "MODERATE", "HIGH", "SEVERE"]);
const MAX_MESSAGE_LENGTH = 1200;
const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_CONTENT_LENGTH = 600;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asNumberMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const map = value as Record<string, unknown>;
  const out: Record<string, number> = {};
  Object.entries(map).forEach(([key, v]) => {
    if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
  });
  return out;
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function parseMemoryRow(row: UserMemoryRow | null): UserMemoryRecord | null {
  if (!row) return null;
  return {
    user_name: row.user_name,
    work_type: row.work_type,
    pain_points: asStringArray(row.pain_points),
    goals: asStringArray(row.goals),
    motivation_style: row.motivation_style,
    posture_history: asStringArray(row.posture_history),
    emotional_patterns: asNumberMap(row.emotional_patterns),
    fatigue_trends: asNumberMap(row.fatigue_trends),
    preferences: asObject(row.preferences),
    conversation_summary: row.conversation_summary
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function normalizeMetrics(metrics: PostureAIMetrics): PostureAIMetrics {
  const normalizedRisk = String(metrics.risk_level ?? "LOW").toUpperCase();
  const weeklyTrend = Array.isArray(metrics.weekly_trend)
    ? metrics.weekly_trend
        .slice(-14)
        .map((point) => ({
          date: String(point?.date ?? ""),
          avg_score: clampNumber(point?.avg_score, 0, 100, 0),
          sessions_count: clampNumber(point?.sessions_count, 0, 20, 0)
        }))
    : [];

  return {
    ...metrics,
    alignment_score: clampNumber(metrics.alignment_score, 0, 100, 0),
    fatigue_level: clampNumber(metrics.fatigue_level, 0, 100, 0),
    session_duration: clampNumber(metrics.session_duration, 0, 24 * 60 * 60, 0),
    risk_level: RISK_LEVELS.has(normalizedRisk) ? normalizedRisk : "LOW",
    weekly_trend: weeklyTrend
  };
}

function normalizeHistory(history: PostureAIMessage[] | undefined): PostureAIMessage[] {
  if (!Array.isArray(history)) return [];
  const nowIso = new Date().toISOString();
  return history
    .filter((msg) => msg && (msg.role === "user" || msg.role === "assistant"))
    .slice(-MAX_HISTORY_MESSAGES)
    .map((msg, index) => ({
      id: typeof msg.id === "string" && msg.id.trim() ? msg.id : `h-${index}-${Date.now()}`,
      role: msg.role,
      content: String(msg.content ?? "").slice(0, MAX_HISTORY_CONTENT_LENGTH),
      createdAt: typeof msg.createdAt === "string" && msg.createdAt ? msg.createdAt : nowIso
    }));
}

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  const [{ data: logs, error: logsError }, { data: emotionRow }, { data: memoryRow }] = await Promise.all([
    supabase
      .from("conversation_log")
      .select("id, role, message, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("emotion_state").select("primary_emotion, intensity, confidence").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("user_memory")
      .select(
        "user_name, work_type, pain_points, goals, motivation_style, posture_history, emotional_patterns, fatigue_trends, preferences, conversation_summary"
      )
      .eq("user_id", user.id)
      .maybeSingle()
  ]);

  if (logsError) {
    return apiError(logsError.message, 500, "COACH_STATE_READ_FAILED");
  }

  const messages = ((logs ?? []) as ConversationLogRow[])
    .reverse()
    .map((row) => ({
      id: row.id,
      role: row.role,
      content: row.message,
      createdAt: row.created_at
    }));

  return apiOk({
    messages,
    emotion: (emotionRow as EmotionStateRow | null)?.primary_emotion ?? "neutral",
    memory: parseMemoryRow((memoryRow as UserMemoryRow | null) ?? null)
  });
}

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }

  let body: CoachRequestBody;
  try {
    body = (await request.json()) as CoachRequestBody;
  } catch {
    return apiError("Invalid JSON body.", 400, "INVALID_JSON");
  }

  const userMessage = sanitizeText(body.message, MAX_MESSAGE_LENGTH);
  if (!userMessage) {
    return apiError("Message is required.", 400, "MESSAGE_REQUIRED");
  }
  if (userMessage.length > MAX_MESSAGE_LENGTH) {
    return apiError(`Message is too long. Keep it under ${MAX_MESSAGE_LENGTH} characters.`, 400, "MESSAGE_TOO_LONG");
  }

  if (!body.metrics) {
    return apiError("Metrics are required.", 400, "METRICS_REQUIRED");
  }
  const metrics = normalizeMetrics(body.metrics);

  const [{ data: emotionRow }, { data: memoryRow }] = await Promise.all([
    supabase.from("emotion_state").select("primary_emotion, intensity, confidence").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("user_memory")
      .select(
        "user_name, work_type, pain_points, goals, motivation_style, posture_history, emotional_patterns, fatigue_trends, preferences, conversation_summary"
      )
      .eq("user_id", user.id)
      .maybeSingle()
  ]);

  const { data: personalizationRow } = await supabase
    .from("users")
    .select("px_ai_style")
    .eq("id", user.id)
    .maybeSingle();

  const previousEmotion = (emotionRow as EmotionStateRow | null)?.primary_emotion ?? null;
  const existingMemory = parseMemoryRow((memoryRow as UserMemoryRow | null) ?? null) ?? createDefaultMemory();
  const recentHistory = normalizeHistory(body.conversation_history);

  const emotion = detectEmotionSignal({
    userMessage,
    metrics,
    previousEmotion
  });
  const persona = selectCoachPersona({
    userMessage,
    emotion,
    metrics,
    preferredStyle: (personalizationRow as { px_ai_style?: string | null } | null)?.px_ai_style ?? null
  });

  const llm = await generateLLMCoachResponse({
    userMessage,
    metrics,
    emotion,
    persona,
    memory: existingMemory,
    history: recentHistory,
    pageContext: body.page_context
  });
  if (llm.provider !== "gemini" || !llm.text) {
    return apiError(
      "Gemini is unavailable right now. Please try again in a moment.",
      503,
      llm.reason || "GEMINI_UNAVAILABLE"
    );
  }

  const assistantMessage = llm.text;

  const updatedMemory = buildUpdatedMemory({
    userMessage,
    assistantMessage,
    metrics,
    emotion,
    previousMemory: existingMemory
  });

  const contextPayload = {
    alignment_score: Number(metrics.alignment_score ?? 0),
    session_time: Number(metrics.session_duration ?? 0),
    fatigue_level: Number(metrics.fatigue_level ?? 0),
    risk_level: metrics.risk_level,
    trend: metrics.weekly_trend
  };
  const nowIso = new Date().toISOString();

  const [memoryUpsert, emotionUpsert, contextUpsert, conversationInsert] = await Promise.all([
    supabase.from("user_memory").upsert(
      {
        user_id: user.id,
        ...updatedMemory,
        updated_at: nowIso
      },
      { onConflict: "user_id" }
    ),
    supabase.from("emotion_state").upsert(
      {
        user_id: user.id,
        primary_emotion: emotion.primaryEmotion,
        intensity: emotion.intensity,
        confidence: emotion.confidence,
        triggers: emotion.triggers,
        updated_at: nowIso
      },
      { onConflict: "user_id" }
    ),
    supabase.from("posture_context").upsert(
      {
        user_id: user.id,
        ...contextPayload,
        updated_at: nowIso
      },
      { onConflict: "user_id" }
    ),
    supabase.from("conversation_log").insert([
      {
        user_id: user.id,
        role: "user",
        message: userMessage,
        emotion: emotion.primaryEmotion,
        posture_context: contextPayload
      },
      {
        user_id: user.id,
        role: "assistant",
        message: assistantMessage,
        emotion: emotion.primaryEmotion,
        posture_context: contextPayload
      }
    ])
  ]);

  const error =
    memoryUpsert.error ||
    emotionUpsert.error ||
    contextUpsert.error ||
    conversationInsert.error;
  if (error) {
    return apiError(error.message, 500, "COACH_WRITE_FAILED");
  }

  return apiOk({
    message: {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: assistantMessage,
      createdAt: new Date().toISOString()
    },
    emotion: {
      primary: emotion.primaryEmotion,
      intensity: emotion.intensity,
      confidence: emotion.confidence,
      tone: emotion.coachingTone
    },
    llm_provider: llm.provider,
    llm_reason: llm.reason ?? null,
    personality: {
      id: persona.id,
      label: persona.label
    },
    memory: updatedMemory
  });
}
