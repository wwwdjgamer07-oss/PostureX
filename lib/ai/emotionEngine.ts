import type { PostureAIMetrics } from "@/lib/postureAI";

export type EmotionLabel =
  | "frustration"
  | "fatigue"
  | "confidence"
  | "stress"
  | "discouragement"
  | "achievement"
  | "neutral";

export interface EmotionSignal {
  primaryEmotion: EmotionLabel;
  intensity: number;
  confidence: number;
  triggers: string[];
  coachingTone: "reassuring" | "gentle" | "upbeat" | "soothing" | "firm" | "neutral";
}

interface EmotionInput {
  userMessage: string;
  metrics: PostureAIMetrics;
  previousEmotion?: EmotionLabel | null;
}

const frustrationWords = ["annoyed", "frustrated", "hate", "can't", "stuck", "bad"];
const stressWords = ["stressed", "overwhelmed", "deadline", "pressure", "anxious"];
const discouragementWords = ["give up", "hopeless", "worse", "not improving", "discouraged"];
const achievementWords = ["better", "improved", "great", "proud", "good progress", "win"];

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function detectEmotionSignal(input: EmotionInput): EmotionSignal {
  const text = input.userMessage.toLowerCase();
  const triggers: string[] = [];
  const scores: Record<EmotionLabel, number> = {
    frustration: 0.15,
    fatigue: 0.15,
    confidence: 0.15,
    stress: 0.15,
    discouragement: 0.15,
    achievement: 0.15,
    neutral: 0.1
  };

  if (includesAny(text, frustrationWords)) {
    scores.frustration += 0.45;
    triggers.push("frustration_language");
  }
  if (includesAny(text, stressWords)) {
    scores.stress += 0.45;
    triggers.push("stress_language");
  }
  if (includesAny(text, discouragementWords)) {
    scores.discouragement += 0.45;
    triggers.push("discouragement_language");
  }
  if (includesAny(text, achievementWords)) {
    scores.achievement += 0.45;
    scores.confidence += 0.25;
    triggers.push("achievement_language");
  }

  if (input.metrics.fatigue_level >= 75) {
    scores.fatigue += 0.5;
    triggers.push("high_fatigue_metric");
  } else if (input.metrics.fatigue_level >= 50) {
    scores.fatigue += 0.25;
    triggers.push("moderate_fatigue_metric");
  }

  if (input.metrics.session_duration >= 90 * 60) {
    scores.fatigue += 0.2;
    scores.stress += 0.1;
    triggers.push("long_session_duration");
  }

  if (input.metrics.weekly_trend.length >= 2) {
    const first = input.metrics.weekly_trend[0]?.avg_score ?? 0;
    const last = input.metrics.weekly_trend[input.metrics.weekly_trend.length - 1]?.avg_score ?? first;
    const delta = last - first;
    if (delta >= 6) {
      scores.achievement += 0.2;
      scores.confidence += 0.25;
      triggers.push("positive_weekly_trend");
    }
    if (delta <= -6) {
      scores.discouragement += 0.25;
      triggers.push("negative_weekly_trend");
    }
  }

  if (input.previousEmotion && input.previousEmotion !== "neutral") {
    scores[input.previousEmotion] += 0.08;
    triggers.push("emotion_continuity");
  }

  const sorted = (Object.entries(scores) as Array<[EmotionLabel, number]>).sort((a, b) => b[1] - a[1]);
  const [primaryEmotion, topScore] = sorted[0];
  const secondScore = sorted[1]?.[1] ?? 0.1;
  const intensity = clamp(topScore, 0.2, 1);
  const confidence = clamp(topScore - secondScore + 0.45, 0.35, 0.95);

  let coachingTone: EmotionSignal["coachingTone"] = "neutral";
  if (primaryEmotion === "frustration" || primaryEmotion === "discouragement") coachingTone = "reassuring";
  if (primaryEmotion === "fatigue") coachingTone = "gentle";
  if (primaryEmotion === "stress") coachingTone = "soothing";
  if (primaryEmotion === "achievement" || primaryEmotion === "confidence") coachingTone = "upbeat";
  if (input.metrics.risk_level === "SEVERE" || input.metrics.risk_level === "HIGH") coachingTone = "firm";

  return { primaryEmotion, intensity, confidence, triggers, coachingTone };
}

