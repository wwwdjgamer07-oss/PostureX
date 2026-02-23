export interface WeeklyTrendPoint {
  date: string;
  avg_score: number;
  sessions_count: number;
}

export interface PostureAIMetrics {
  alignment_score: number;
  fatigue_level: number;
  session_duration: number;
  risk_level: string;
  weekly_trend: WeeklyTrendPoint[];
  neck_angle?: number;
  shoulder_tilt?: number;
  spine_curve?: number;
  fatigue_index?: number;
  movement_variability?: number;
  trend_history?: number[];
}

export type PostureAIMessageRole = "user" | "assistant";

export interface PostureAIMessage {
  id: string;
  role: PostureAIMessageRole;
  content: string;
  createdAt: string;
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.max(0, Math.floor(totalSeconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${remainingMinutes}m`;
}

function getTrendDelta(weeklyTrend: WeeklyTrendPoint[]) {
  if (weeklyTrend.length < 2) return 0;
  const first = weeklyTrend[0]?.avg_score ?? 0;
  const last = weeklyTrend[weeklyTrend.length - 1]?.avg_score ?? first;
  return Math.round(last - first);
}

function fatigueBand(fatigue: number) {
  if (fatigue >= 75) return "high";
  if (fatigue >= 45) return "moderate";
  return "low";
}

function alignmentQuality(alignment: number) {
  if (alignment >= 90) return "excellent";
  if (alignment >= 75) return "good";
  if (alignment >= 60) return "fair";
  return "strained";
}

export function buildWelcomeMessage(metrics: PostureAIMetrics) {
  const trendDelta = getTrendDelta(metrics.weekly_trend);
  const trendText =
    trendDelta > 0
      ? `Your weekly trend is up ${trendDelta} points.`
      : trendDelta < 0
        ? `Your weekly trend is down ${Math.abs(trendDelta)} points.`
        : "Your weekly trend is stable.";

  return `I am tracking your live posture metrics. Alignment is ${Math.round(metrics.alignment_score)} (${alignmentQuality(
    metrics.alignment_score
  )}), fatigue is ${Math.round(metrics.fatigue_level)}, and current risk is ${metrics.risk_level}. ${trendText}`;
}

export function buildPostureAIReply(question: string, metrics: PostureAIMetrics) {
  const input = question.toLowerCase();
  const alignment = Math.round(metrics.alignment_score);
  const fatigue = Math.round(metrics.fatigue_level);
  const durationLabel = formatDuration(metrics.session_duration);
  const riskLevel = metrics.risk_level;
  const trendDelta = getTrendDelta(metrics.weekly_trend);
  const trendLine =
    trendDelta > 0
      ? `Weekly trend is improving (+${trendDelta}).`
      : trendDelta < 0
        ? `Weekly trend is declining (${trendDelta}).`
        : "Weekly trend is neutral.";

  if (input.includes("alignment") || input.includes("score")) {
    return `Your alignment is ${alignment} today, which is ${alignmentQuality(
      alignment
    )}. Keep shoulders level and keep your head stacked over your chest for the next ${durationLabel} block. ${trendLine}`;
  }

  if (input.includes("fatigue") || input.includes("tired")) {
    const band = fatigueBand(fatigue);
    if (band === "high") {
      return `Fatigue is elevated at ${fatigue} after ${durationLabel}. Risk is ${riskLevel}. Take a 2-minute reset now, then resume with back support and relaxed shoulders.`;
    }
    if (band === "moderate") {
      return `Fatigue is moderate at ${fatigue}. You are still in a recoverable zone. Add a 30-second posture reset every 20 minutes to avoid risk escalation.`;
    }
    return `Fatigue is low at ${fatigue}. Current load is manageable. Maintain your setup and continue periodic micro-breaks.`;
  }

  if (input.includes("risk")) {
    return `Current risk is ${riskLevel}. With alignment at ${alignment} and fatigue at ${fatigue}, the most effective correction is to reduce forward head position and rebalance seat pressure.`;
  }

  if (input.includes("session") || input.includes("duration") || input.includes("time")) {
    return `Session duration is ${durationLabel}. Fatigue tends to accumulate after long uninterrupted blocks, so schedule a brief break before risk climbs further. ${trendLine}`;
  }

  if (input.includes("trend") || input.includes("week")) {
    return `${trendLine} Current alignment is ${alignment} and fatigue is ${fatigue}. Focus on consistency: frequent micro-corrections beat occasional hard corrections.`;
  }

  return `Current posture snapshot: alignment ${alignment}, fatigue ${fatigue}, risk ${riskLevel}, session ${durationLabel}. If you want, ask about alignment, fatigue, risk, or weekly trend for a focused recommendation.`;
}
