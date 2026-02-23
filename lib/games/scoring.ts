export interface UnifiedGameScoreInput {
  alignmentScore: number;
  stabilityTime: number;
  reactionSpeed: number;
  correctionAccuracy: number;
}

export interface UnifiedGameScoreResult {
  gameScore: number;
  xpEarned: number;
  postureQuality: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeSeconds(seconds: number, maxSeconds = 60) {
  return clamp((seconds / maxSeconds) * 100, 0, 100);
}

export function computeUnifiedGameScore(input: UnifiedGameScoreInput): UnifiedGameScoreResult {
  const alignment = clamp(input.alignmentScore, 0, 100);
  const stability = normalizeSeconds(input.stabilityTime);
  const reaction = clamp(input.reactionSpeed, 0, 100);
  const correction = clamp(input.correctionAccuracy, 0, 100);

  const postureQuality = Math.round(alignment * 0.62 + correction * 0.38);
  const gameScore = Math.round(alignment * 0.36 + stability * 0.24 + reaction * 0.18 + correction * 0.22);
  const xpEarned = Math.max(10, Math.round(gameScore * 1.25 + postureQuality * 0.35));

  return {
    gameScore: clamp(gameScore, 0, 100),
    xpEarned,
    postureQuality: clamp(postureQuality, 0, 100)
  };
}
