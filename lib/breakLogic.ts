import type { SupabaseClient } from "@supabase/supabase-js";
import type { FatigueLevel } from "@/lib/fatigueDetection";

export interface BreakEvaluationInput {
  elapsedSeconds: number;
  fatigueLevel: FatigueLevel;
  postureScoreTrend: "declining" | "stable" | "improving";
  now: number;
}

export interface BreakState {
  lastReminderAt: number;
  snoozedUntil: number;
}

export type BreakTriggerReason = "time" | "fatigue_high" | "declining_score";

export interface BreakRecommendation {
  reason: BreakTriggerReason;
  message: string;
  suggestion: string;
  urgency: "normal" | "urgent";
}

const TIME_RULE_SECONDS = 45 * 60;
const REMINDER_COOLDOWN_MS = 15 * 60 * 1000;
const EVALUATION_INTERVAL_MS = 10 * 1000;

export function createBreakState(): BreakState {
  return {
    lastReminderAt: 0,
    snoozedUntil: 0
  };
}

export function getBreakEvaluationIntervalMs() {
  return EVALUATION_INTERVAL_MS;
}

export function shouldTriggerBreakReminder(input: BreakEvaluationInput, state: BreakState): BreakRecommendation | null {
  if (input.now < state.snoozedUntil) {
    return null;
  }

  const cooldownActive = input.now - state.lastReminderAt < REMINDER_COOLDOWN_MS;

  if (input.fatigueLevel === "high") {
    return {
      reason: "fatigue_high",
      message: "Walk briefly",
      suggestion: "Urgent break recommended due to high fatigue.",
      urgency: "urgent"
    };
  }

  if (cooldownActive) {
    return null;
  }

  if (input.elapsedSeconds >= TIME_RULE_SECONDS) {
    return {
      reason: "time",
      message: "Time to stand up",
      suggestion: "Stand and reset posture.",
      urgency: "normal"
    };
  }

  if (input.postureScoreTrend === "declining") {
    return {
      reason: "declining_score",
      message: "Take a 2-minute stretch",
      suggestion: "Score trend is declining. Do a quick micro break.",
      urgency: "normal"
    };
  }

  return null;
}

export function applyReminderTriggered(state: BreakState, now: number) {
  state.lastReminderAt = now;
}

export function applySnooze(state: BreakState, now: number) {
  state.snoozedUntil = now + 5 * 60 * 1000;
}

export async function logBreakEvent(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string | null,
  durationSec: number,
  taken: boolean
) {
  const { error } = await supabase.from("breaks").insert({
    user_id: userId,
    session_id: sessionId,
    duration_sec: durationSec,
    taken
  });

  if (error) {
    throw new Error(error.message || "Failed to log break.");
  }
}

export function speakBreakCue() {
  if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") return;
  const utterance = new SpeechSynthesisUtterance("Time to take a break");
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
