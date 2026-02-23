import type { EmotionSignal } from "@/lib/ai/emotionEngine";
import type { PostureAIMetrics } from "@/lib/postureAI";

export type CoachPersonaId = "supportive_guide" | "precision_analyst" | "performance_coach";

export interface CoachPersona {
  id: CoachPersonaId;
  label: string;
  styleHint: string;
}

const SUPPORTIVE_GUIDE: CoachPersona = {
  id: "supportive_guide",
  label: "Supportive Guide",
  styleHint:
    "Use warm, reassuring language. Keep pace gentle, low-pressure, and emotionally supportive. Offer one clear next step."
};

const PRECISION_ANALYST: CoachPersona = {
  id: "precision_analyst",
  label: "Precision Analyst",
  styleHint:
    "Use structured, concise language. Focus on measurable posture cues, risk, and immediate corrective action."
};

const PERFORMANCE_COACH: CoachPersona = {
  id: "performance_coach",
  label: "Performance Coach",
  styleHint:
    "Use energetic, motivating language. Frame corrections as performance gains and habit wins. Keep statements short and action-first."
};

export function selectCoachPersona(input: {
  userMessage: string;
  emotion: EmotionSignal;
  metrics: PostureAIMetrics;
}): CoachPersona {
  const text = input.userMessage.toLowerCase();
  const fatigue = Number(input.metrics.fatigue_level ?? 0);
  const alignment = Number(input.metrics.alignment_score ?? 0);

  const supportiveSignals =
    /(sad|anxious|stress|stressed|overwhelmed|pain|hurt|ache|tired|fatigue|exhausted|drained|frustrated)/.test(text) ||
    input.emotion.coachingTone === "gentle" ||
    input.emotion.coachingTone === "reassuring" ||
    fatigue >= 70;

  if (supportiveSignals) return SUPPORTIVE_GUIDE;

  const performanceSignals =
    /(challenge|push|strict|hard|discipline|goal|target|improve fast|level up|optimize|athletic|performance|bro)/.test(text) ||
    input.emotion.coachingTone === "upbeat";

  if (performanceSignals) return PERFORMANCE_COACH;

  if (alignment < 70 || input.metrics.risk_level === "HIGH" || input.metrics.risk_level === "SEVERE") {
    return PRECISION_ANALYST;
  }

  return PRECISION_ANALYST;
}

