import type { EmotionSignal } from "@/lib/ai/emotionEngine";
import type { PostureAIMetrics } from "@/lib/postureAI";

export interface UserMemoryRecord {
  user_name: string | null;
  work_type: string | null;
  pain_points: string[];
  goals: string[];
  motivation_style: string | null;
  posture_history: string[];
  emotional_patterns: Record<string, number>;
  fatigue_trends: Record<string, number>;
  preferences: Record<string, unknown>;
  conversation_summary: string | null;
}

interface MemoryUpdateInput {
  userMessage: string;
  assistantMessage: string;
  metrics: PostureAIMetrics;
  emotion: EmotionSignal;
  previousMemory: UserMemoryRecord | null;
}

function uniqMerge(base: string[], next: string[]) {
  return Array.from(new Set([...base, ...next].map((item) => item.trim()).filter(Boolean)));
}

function extractByPatterns(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function mergeCounts(base: Record<string, number>, key: string, amount: number) {
  return { ...base, [key]: Number(base[key] ?? 0) + amount };
}

function detectFatigueSlot(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function createDefaultMemory(): UserMemoryRecord {
  return {
    user_name: null,
    work_type: null,
    pain_points: [],
    goals: [],
    motivation_style: "encouragement",
    posture_history: [],
    emotional_patterns: {},
    fatigue_trends: {},
    preferences: {},
    conversation_summary: null
  };
}

export function buildUpdatedMemory(input: MemoryUpdateInput): UserMemoryRecord {
  const previous = input.previousMemory ?? createDefaultMemory();
  const text = input.userMessage.toLowerCase();

  const extractedName = extractByPatterns(text, [
    /my name is ([a-z][a-z\s'-]{1,40})/i,
    /i am ([a-z][a-z\s'-]{1,40})/i
  ]);
  const extractedWork = extractByPatterns(text, [
    /i work as (?:a |an )?([a-z\s-]{2,40})/i,
    /i am (?:a |an )?([a-z\s-]{2,40}) by profession/i,
    /i'?m (?:a |an )?(student|developer|designer|teacher|engineer|manager)/i
  ]);
  const painMention = extractByPatterns(text, [
    /pain in (?:my )?([a-z\s]{2,30})/i,
    /((?:neck|back|shoulder|wrist|lower back)\s+(?:pain|strain|tightness))/i
  ]);
  const goalMention = extractByPatterns(text, [
    /my goal is to ([a-z\s]{3,80})/i,
    /i want to ([a-z\s]{3,80})/i,
    /help me ([a-z\s]{3,80})/i
  ]);

  const motivationStyle =
    text.includes("strict") || text.includes("push me")
      ? "direct"
      : text.includes("gentle") || text.includes("encourage")
        ? "encouragement"
        : previous.motivation_style;

  const postureEntry = `alignment:${Math.round(input.metrics.alignment_score)} fatigue:${Math.round(
    input.metrics.fatigue_level
  )} risk:${input.metrics.risk_level}`;

  const summaryBase = [
    `User asked: ${input.userMessage.slice(0, 120)}`,
    `Coach replied: ${input.assistantMessage.slice(0, 120)}`,
    `Emotion: ${input.emotion.primaryEmotion}`,
    `Metrics A${Math.round(input.metrics.alignment_score)} F${Math.round(input.metrics.fatigue_level)}`
  ].join(" | ");

  const emotionalPatterns = mergeCounts(previous.emotional_patterns, input.emotion.primaryEmotion, 1);
  const fatigueSlot = detectFatigueSlot();
  const fatigueTrends =
    input.metrics.fatigue_level >= 55
      ? mergeCounts(previous.fatigue_trends, fatigueSlot, 1)
      : previous.fatigue_trends;

  return {
    user_name: extractedName ?? previous.user_name,
    work_type: extractedWork ?? previous.work_type,
    pain_points: uniqMerge(previous.pain_points, painMention ? [painMention] : []),
    goals: uniqMerge(previous.goals, goalMention ? [goalMention] : []),
    motivation_style: motivationStyle,
    posture_history: uniqMerge(previous.posture_history.slice(-11), [postureEntry]).slice(-12),
    emotional_patterns: emotionalPatterns,
    fatigue_trends: fatigueTrends,
    preferences: {
      ...previous.preferences,
      last_tone: input.emotion.coachingTone
    },
    conversation_summary: summaryBase
  };
}
