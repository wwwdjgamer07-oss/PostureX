export type FatigueLevel = "none" | "low" | "medium" | "high";
export type FatigueAction = "suggestion" | "warning" | "break_alert" | "none";

export interface FatigueSample {
  score: number;
  at: number;
}

export interface FatigueState {
  fatigue_level: FatigueLevel;
  duration: number;
  avg_score: number;
  action: FatigueAction;
  message: string;
}

const FIVE_MIN_MS = 5 * 60 * 1000;

function average(scores: number[]) {
  if (scores.length === 0) return 0;
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}

function scoreWindow(samples: FatigueSample[], now: number, windowMs: number) {
  const start = now - windowMs;
  const inWindow = samples.filter((sample) => sample.at >= start);
  const coverageMs = inWindow.length > 0 ? now - inWindow[0].at : 0;
  return {
    avg: average(inWindow.map((sample) => sample.score)),
    coverageMs
  };
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function addFatigueSample(samples: FatigueSample[], score: number, now = Date.now()) {
  const next = [...samples, { score: clampScore(score), at: now }];
  const cutoff = now - FIVE_MIN_MS;
  return next.filter((sample) => sample.at >= cutoff);
}

export function calculateFatigueState(samples: FatigueSample[], now = Date.now()): FatigueState {
  const lowWindow = scoreWindow(samples, now, 2 * 60 * 1000);
  const mediumWindow = scoreWindow(samples, now, 3 * 60 * 1000);
  const highWindow = scoreWindow(samples, now, FIVE_MIN_MS);

  if (highWindow.coverageMs >= FIVE_MIN_MS && highWindow.avg < 40) {
    return {
      fatigue_level: "high",
      duration: 5 * 60,
      avg_score: Number(highWindow.avg.toFixed(1)),
      action: "break_alert",
      message: "You look fatigued"
    };
  }

  if (mediumWindow.coverageMs >= 3 * 60 * 1000 && mediumWindow.avg < 50) {
    return {
      fatigue_level: "medium",
      duration: 3 * 60,
      avg_score: Number(mediumWindow.avg.toFixed(1)),
      action: "warning",
      message: "You look fatigued"
    };
  }

  if (lowWindow.coverageMs >= 2 * 60 * 1000 && lowWindow.avg < 60) {
    return {
      fatigue_level: "low",
      duration: 2 * 60,
      avg_score: Number(lowWindow.avg.toFixed(1)),
      action: "suggestion",
      message: "You look fatigued"
    };
  }

  return {
    fatigue_level: "none",
    duration: 0,
    avg_score: Number(lowWindow.avg.toFixed(1)),
    action: "none",
    message: "Posture energy stable"
  };
}

