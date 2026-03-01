export type PostureSession = {
  date: string;
  avgScore: number;
  alignment: number;
  stability: number;
  symmetry: number;
  duration: number;
  forwardLeanEvents: number;
  tiltLeftEvents: number;
  tiltRightEvents: number;
  scoreFirst5min?: number;
  scoreLast5min?: number;
};

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function generatePXCoachMessage(current: PostureSession, history: PostureSession[]) {
  const last5 = history.slice(-5);
  const avgRecent = mean(last5.map((session) => session.avgScore));
  const trendScore = current.avgScore - avgRecent;
  const weakestMetricName =
    current.alignment <= current.stability && current.alignment <= current.symmetry
      ? "alignment"
      : current.stability <= current.alignment && current.stability <= current.symmetry
        ? "stability"
        : "symmetry";

  const scoreFirst5min = Number.isFinite(current.scoreFirst5min) ? Number(current.scoreFirst5min) : current.avgScore;
  const scoreLast5min = Number.isFinite(current.scoreLast5min) ? Number(current.scoreLast5min) : current.avgScore;
  const fatigueDrop = scoreFirst5min - scoreLast5min;
  const tiltBias = current.tiltRightEvents - current.tiltLeftEvents;

  if (trendScore > 5) return "Nice improvement vs recent sessions.";
  if (trendScore < -5) return "Posture dipped today. Recalibrate seating.";
  if (fatigueDrop > 10) return "Posture drops after prolonged sitting. Take micro-breaks.";
  if (weakestMetricName === "alignment") return "Forward lean detected. Bring screen closer.";
  if (weakestMetricName === "stability") return "You shift frequently. Stabilize shoulders.";
  if (weakestMetricName === "symmetry") return "Side tilt pattern detected. Balance posture.";
  if (tiltBias > 5) return "Right tilt recurring. Level shoulders.";
  if (tiltBias < -5) return "Left tilt recurring. Center posture.";
  if (current.duration > 45 && current.avgScore > 80) return "Strong sustained posture today.";
  return "Steady posture. Maintain awareness.";
}

